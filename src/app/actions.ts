"use server";

import bcrypt from "bcryptjs";
import { InstrumentStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import { mkdir, rm, unlink, writeFile } from "fs/promises";
import { z } from "zod";

import {
  authenticateUser,
  clearSession,
  createSession,
  requireAdmin,
  requireUser
} from "@/lib/auth";
import { db } from "@/lib/db";
import { parseLabDateTime } from "@/lib/lab-time";
import { getManualsRoot } from "@/lib/storage";

function withNotice(target: string, type: "success" | "error", message: string) {
  const [pathname, existingQuery = ""] = target.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("noticeType", type);
  params.set("notice", message);

  return `${pathname}?${params.toString()}`;
}

function getReturnTo(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value || fallback;
}

const userSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role)
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

const instrumentSchema = z.object({
  name: z.string().trim().min(2),
  location: z.string().trim().min(2),
  description: z.string().trim().min(10),
  status: z.nativeEnum(InstrumentStatus)
});

const maintenanceSchema = z.object({
  instrumentId: z.string().min(1),
  performedAt: z.string().min(1),
  summary: z.string().trim().min(3),
  status: z.string().trim().min(2),
  notes: z.string().trim().optional()
});

const reservationSchema = z.object({
  instrumentId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  purpose: z.string().trim().optional()
});

const reservationUpdateSchema = reservationSchema.extend({
  reservationId: z.string().min(1)
});

async function ensureReservationAccess(reservationId: string, userId: string, role: Role) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      instrument: {
        select: {
          id: true
        }
      }
    }
  });

  if (!reservation) {
    return null;
  }

  const canManage = reservation.userId === userId || role === Role.ADMIN;

  if (!canManage) {
    return null;
  }

  return reservation;
}

async function removeFileIfPresent(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await authenticateUser(email, password);

  if (!user) {
    redirect(withNotice("/login", "error", "Incorrect email or password."));
  }

  await createSession({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email
  });

  redirect("/instruments");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect(withNotice("/admin/users", "error", "Please provide a valid user form."));
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (existing) {
    redirect(withNotice("/admin/users", "error", "That email address already exists."));
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role
    }
  });

  revalidatePath("/admin/users");
  redirect(withNotice("/admin/users", "success", "User created."));
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect(withNotice("/admin/users", "error", "User details were missing."));
  }

  if (userId === admin.id) {
    redirect(withNotice("/admin/users", "error", "You cannot delete your own account."));
  }

  const user = await db.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      role: true,
      name: true
    }
  });

  if (!user) {
    redirect(withNotice("/admin/users", "error", "User not found."));
  }

  if (user.role === Role.ADMIN) {
    const adminCount = await db.user.count({
      where: {
        role: Role.ADMIN
      }
    });

    if (adminCount <= 1) {
      redirect(withNotice("/admin/users", "error", "You must keep at least one admin account."));
    }
  }

  await db.user.delete({
    where: {
      id: userId
    }
  });

  revalidatePath("/admin/users");
  redirect(withNotice("/admin/users", "success", `Deleted ${user.name}.`));
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const returnTo = getReturnTo(formData, "/account");

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword")
  });

  if (!parsed.success) {
    redirect(withNotice(returnTo, "error", "Please complete the password form correctly."));
  }

  const existingUser = await db.user.findUnique({
    where: {
      id: user.id
    }
  });

  if (!existingUser) {
    redirect(withNotice("/login", "error", "Your account could not be found."));
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, existingUser.passwordHash);

  if (!matches) {
    redirect(withNotice(returnTo, "error", "Current password is incorrect."));
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await db.user.update({
    where: {
      id: user.id
    },
    data: {
      passwordHash
    }
  });

  redirect(withNotice(returnTo, "success", "Password updated."));
}

export async function createInstrumentAction(formData: FormData) {
  await requireUser();

  const parsed = instrumentSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location"),
    description: formData.get("description"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect(withNotice("/instruments/new", "error", "Please complete all instrument fields."));
  }

  const instrument = await db.instrument.create({
    data: parsed.data
  });

  revalidatePath("/instruments");
  redirect(withNotice(`/instruments/${instrument.id}`, "success", "Instrument added."));
}

export async function uploadManualAction(formData: FormData) {
  await requireUser();

  const instrumentId = String(formData.get("instrumentId") ?? "");
  const file = formData.get("manual");

  if (!instrumentId || !(file instanceof File) || file.size === 0) {
    redirect(withNotice(`/instruments/${instrumentId}`, "error", "Please choose a manual file."));
  }

  const instrument = await db.instrument.findUnique({
    where: { id: instrumentId },
    select: { id: true }
  });

  if (!instrument) {
    redirect(withNotice("/instruments", "error", "Instrument not found."));
  }

  const storedName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const instrumentDirectory = path.join(getManualsRoot(), instrumentId);
  const filePath = path.join(instrumentDirectory, storedName);

  await mkdir(instrumentDirectory, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  await db.manual.create({
    data: {
      instrumentId,
      originalName: file.name,
      storedName,
      mimeType: file.type || "application/octet-stream",
      filePath
    }
  });

  revalidatePath(`/instruments/${instrumentId}`);
  redirect(withNotice(`/instruments/${instrumentId}`, "success", "Manual uploaded."));
}

export async function deleteManualAction(formData: FormData) {
  await requireUser();

  const manualId = String(formData.get("manualId") ?? "");
  const instrumentId = String(formData.get("instrumentId") ?? "");
  const returnTo = getReturnTo(formData, `/instruments/${instrumentId}`);

  if (!manualId || !instrumentId) {
    redirect(withNotice(returnTo, "error", "Manual details were missing."));
  }

  const manual = await db.manual.findUnique({
    where: {
      id: manualId
    }
  });

  if (!manual || manual.instrumentId !== instrumentId) {
    redirect(withNotice(returnTo, "error", "Manual not found."));
  }

  await removeFileIfPresent(manual.filePath);

  await db.manual.delete({
    where: {
      id: manualId
    }
  });

  revalidatePath(`/instruments/${instrumentId}`);
  redirect(withNotice(returnTo, "success", "Manual removed."));
}

export async function deleteInstrumentAction(formData: FormData) {
  await requireAdmin();

  const instrumentId = String(formData.get("instrumentId") ?? "");

  if (!instrumentId) {
    redirect(withNotice("/instruments", "error", "Instrument details were missing."));
  }

  const instrument = await db.instrument.findUnique({
    where: {
      id: instrumentId
    },
    include: {
      manuals: true
    }
  });

  if (!instrument) {
    redirect(withNotice("/instruments", "error", "Instrument not found."));
  }

  await Promise.all(instrument.manuals.map((manual) => removeFileIfPresent(manual.filePath)));

  await db.instrument.delete({
    where: {
      id: instrumentId
    }
  });

  await rm(path.join(getManualsRoot(), instrumentId), {
    recursive: true,
    force: true
  });

  revalidatePath("/instruments");
  redirect(withNotice("/instruments", "success", `Deleted ${instrument.name}.`));
}

export async function addMaintenanceEntryAction(formData: FormData) {
  const user = await requireUser();

  const parsed = maintenanceSchema.safeParse({
    instrumentId: formData.get("instrumentId"),
    performedAt: formData.get("performedAt"),
    summary: formData.get("summary"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined
  });

  if (!parsed.success) {
    redirect(withNotice(`/instruments/${String(formData.get("instrumentId") ?? "")}`, "error", "Please complete the maintenance log form."));
  }

  await db.maintenanceEntry.create({
    data: {
      instrumentId: parsed.data.instrumentId,
      performedAt: new Date(parsed.data.performedAt),
      summary: parsed.data.summary,
      status: parsed.data.status,
      notes: parsed.data.notes,
      performedById: user.id
    }
  });

  revalidatePath(`/instruments/${parsed.data.instrumentId}`);
  redirect(withNotice(`/instruments/${parsed.data.instrumentId}`, "success", "Maintenance row added."));
}

export async function createReservationAction(formData: FormData) {
  const user = await requireUser();
  const returnTo = getReturnTo(formData, `/instruments/${String(formData.get("instrumentId") ?? "")}`);

  const parsed = reservationSchema.safeParse({
    instrumentId: formData.get("instrumentId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose") || undefined
  });

  if (!parsed.success) {
    redirect(withNotice(returnTo, "error", "Please complete the reservation form."));
  }

  const startAt = parseLabDateTime(parsed.data.date, parsed.data.startTime);
  const endAt = parseLabDateTime(parsed.data.date, parsed.data.endTime);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    redirect(withNotice(returnTo, "error", "Choose a valid time range."));
  }

  const conflict = await db.reservation.findFirst({
    where: {
      instrumentId: parsed.data.instrumentId,
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    }
  });

  if (conflict) {
    redirect(withNotice(returnTo, "error", "That time slot is already reserved."));
  }

  await db.reservation.create({
    data: {
      instrumentId: parsed.data.instrumentId,
      userId: user.id,
      startAt,
      endAt,
      purpose: parsed.data.purpose
    }
  });

  revalidatePath(`/instruments/${parsed.data.instrumentId}`);
  redirect(withNotice(returnTo, "success", "Reservation created."));
}

export async function updateReservationAction(formData: FormData) {
  const user = await requireUser();
  const returnTo = getReturnTo(formData, `/instruments/${String(formData.get("instrumentId") ?? "")}`);

  const parsed = reservationUpdateSchema.safeParse({
    reservationId: formData.get("reservationId"),
    instrumentId: formData.get("instrumentId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose") || undefined
  });

  if (!parsed.success) {
    redirect(withNotice(returnTo, "error", "Please complete the reservation edit form."));
  }

  const reservation = await ensureReservationAccess(parsed.data.reservationId, user.id, user.role);

  if (!reservation) {
    redirect(withNotice(returnTo, "error", "You do not have permission to edit that reservation."));
  }

  const startAt = parseLabDateTime(parsed.data.date, parsed.data.startTime);
  const endAt = parseLabDateTime(parsed.data.date, parsed.data.endTime);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    redirect(withNotice(returnTo, "error", "Choose a valid time range."));
  }

  const conflict = await db.reservation.findFirst({
    where: {
      instrumentId: parsed.data.instrumentId,
      id: {
        not: parsed.data.reservationId
      },
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    }
  });

  if (conflict) {
    redirect(withNotice(returnTo, "error", "That updated time overlaps an existing booking."));
  }

  await db.reservation.update({
    where: {
      id: parsed.data.reservationId
    },
    data: {
      startAt,
      endAt,
      purpose: parsed.data.purpose
    }
  });

  revalidatePath(`/instruments/${parsed.data.instrumentId}`);
  redirect(withNotice(returnTo, "success", "Reservation updated."));
}

export async function cancelReservationAction(formData: FormData) {
  const user = await requireUser();
  const reservationId = String(formData.get("reservationId") ?? "");
  const instrumentId = String(formData.get("instrumentId") ?? "");
  const returnTo = getReturnTo(formData, `/instruments/${instrumentId}`);

  if (!reservationId || !instrumentId) {
    redirect(withNotice(returnTo, "error", "Reservation details were missing."));
  }

  const reservation = await ensureReservationAccess(reservationId, user.id, user.role);

  if (!reservation) {
    redirect(withNotice(returnTo, "error", "You do not have permission to cancel that reservation."));
  }

  await db.reservation.delete({
    where: {
      id: reservationId
    }
  });

  revalidatePath(`/instruments/${instrumentId}`);
  redirect(withNotice(returnTo, "success", "Reservation canceled."));
}
