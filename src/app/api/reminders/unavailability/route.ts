import { NextResponse } from "next/server";

import { sendDueUnavailabilityReminders } from "@/lib/unavailability-reminders";

function isAuthorized(request: Request) {
  const expectedToken = process.env.REMINDER_JOB_TOKEN;

  if (!expectedToken) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${expectedToken}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueUnavailabilityReminders();

  return NextResponse.json({
    ok: true,
    ...result
  });
}
