import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { outlookAuthorizeUrl, outlookConfigured, sealOutlook } from "@/lib/outlook";
export async function GET() {
  const user=await requireUser("/account");
  if(user.role==="TEMP" || !outlookConfigured()) return NextResponse.json({error:"Outlook connection is not enabled."},{status:503});
  const state=randomBytes(32).toString("base64url"), verifier=randomBytes(48).toString("base64url");
  (await cookies()).set("outlook_oauth",sealOutlook(JSON.stringify({state,verifier,userId:user.id,expires:Date.now()+600000})),{httpOnly:true,secure:process.env.APP_URL!.startsWith("https:"),sameSite:"lax",maxAge:600,path:"/api/outlook"});
  return NextResponse.redirect(outlookAuthorizeUrl(state,verifier));
}
