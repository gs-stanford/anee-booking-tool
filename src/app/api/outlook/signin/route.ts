import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { outlookAuthorizeUrl,outlookConfigured,sealOutlook } from "@/lib/outlook";
export async function GET() {
  if (!outlookConfigured()) return NextResponse.json({error:"Microsoft sign-in is not enabled."},{status:503});
  const state=randomBytes(32).toString("base64url"),verifier=randomBytes(48).toString("base64url");
  (await cookies()).set("outlook_oauth",sealOutlook(JSON.stringify({mode:"signin",state,verifier,expires:Date.now()+600000})),{httpOnly:true,secure:process.env.APP_URL!.startsWith("https:"),sameSite:"lax",maxAge:600,path:"/api/outlook"});
  return NextResponse.redirect(outlookAuthorizeUrl(state,verifier));
}
