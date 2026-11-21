import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openOutlook,outlookTokens,outlookGraph,outlookRedirectUri,sealOutlook,syncOutlookUser } from "@/lib/outlook";
export async function GET(request:Request) {
  const user=await requireUser("/account");
  const cookieStore=await cookies();
  const raw=cookieStore.get("outlook_oauth")?.value;
  cookieStore.set("outlook_oauth","",{maxAge:0,path:"/api/outlook"});
  const target=new URL("/account",process.env.APP_URL!);
  try {
    const query=new URL(request.url).searchParams;
    if(!raw || !query.get("code") || user.role==="TEMP") throw new Error();
    const state=JSON.parse(openOutlook(raw)) as {state:string;verifier:string;userId:string;expires:number};
    const received=Buffer.from(query.get("state")??"");
    if(state.userId!==user.id || state.expires<Date.now() || received.length!==Buffer.byteLength(state.state) || !timingSafeEqual(received,Buffer.from(state.state))) throw new Error();
    const tokens=await outlookTokens({grant_type:"authorization_code",code:query.get("code")!,redirect_uri:outlookRedirectUri(),code_verifier:state.verifier});
    if(!tokens.refresh_token) throw new Error();
    const profile=await outlookGraph(tokens.access_token,"/me?$select=id,mail,userPrincipalName");
    const existing=await db.outlookConnection.findUnique({where:{userId:user.id}});
    if(existing && existing.microsoftId!==profile.id) {
      if(existing.refreshToken) throw new Error();
      await db.outlookConnection.delete({where:{userId:user.id}});
    }
    await db.outlookConnection.upsert({where:{userId:user.id},create:{userId:user.id,microsoftId:profile.id,email:profile.mail??profile.userPrincipalName,refreshToken:sealOutlook(tokens.refresh_token)},update:{refreshToken:sealOutlook(tokens.refresh_token),email:profile.mail??profile.userPrincipalName,lastError:null}});
    after(()=>syncOutlookUser(user.id));
    target.searchParams.set("noticeType","success");target.searchParams.set("notice","Outlook connected. Your personal lab events are syncing.");
  } catch {
    target.searchParams.set("noticeType","error");target.searchParams.set("notice","Outlook connection was not completed. Retry, or disconnect before choosing a different Microsoft account. Your organization may need to approve access.");
  }
  return NextResponse.redirect(target);
}
