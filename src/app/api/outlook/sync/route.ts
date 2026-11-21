import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncConnectedOutlookCalendars } from "@/lib/outlook";
export async function POST(request:Request) {
  const expected=process.env.OUTLOOK_SYNC_JOB_TOKEN;
  const received=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  if(!expected || Buffer.byteLength(received)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(received),Buffer.from(expected))) return NextResponse.json({error:"Unauthorized"},{status:401});
  await syncConnectedOutlookCalendars();
  return NextResponse.json({ok:true});
}
