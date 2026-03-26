import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

const SESSION_COOKIE = "lab_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  role: Role;
  name: string;
  email: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "local-dev-secret-change-me"
  );
}

function shouldUseSecureCookies() {
  const override = process.env.SESSION_COOKIE_SECURE?.toLowerCase();

  if (override === "true") {
    return true;
  }

  if (override === "false") {
    return false;
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) {
    return appUrl.startsWith("https://");
  }

  return false;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({
    role: payload.role,
    name: payload.name,
    email: payload.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSessionSecret());
    const userId = verified.payload.sub;

    if (!userId) {
      return null;
    }

    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== Role.ADMIN) {
    redirect("/instruments");
  }

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return user;
}
