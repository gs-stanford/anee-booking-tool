import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { createSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateOutlookState, linkedMicrosoftUser } from "@/lib/outlook-identity";
import { outlookConfigured,outlookTokens,outlookGraph,outlookRedirectUri,sealOutlook,syncConnectedOutlookCalendars } from "@/lib/outlook";
export async function GET(request:Request) {
  if(!outlookConfigured()) return NextResponse.json({error:"Microsoft connection is not enabled."},{status:503});
  const currentUser=await getCurrentUser();
  const cookieStore=await cookies();
  const raw=cookieStore.get("outlook_oauth")?.value;
  cookieStore.set("outlook_oauth","",{maxAge:0,path:"/api/outlook"});
  let target=new URL(currentUser?"/account":"/login",process.env.APP_URL!);
  try {
    const query=new URL(request.url).searchParams;
    if(!raw || !query.get("code")) throw new Error();
    const state=validateOutlookState(raw,query.get("state")??"",currentUser?.id);
    target=new URL(state.mode==="signin"?"/login":"/account",process.env.APP_URL!);
    const tokens=await outlookTokens({grant_type:"authorization_code",code:query.get("code")!,redirect_uri:outlookRedirectUri(),code_verifier:state.verifier});
    if(!tokens.refresh_token) throw new Error();
    const refreshToken=sealOutlook(tokens.refresh_token);
    const profile=await outlookGraph(tokens.access_token,"/me?$select=id,mail,userPrincipalName");
    if(typeof profile.id!=="string" || !profile.id) throw new Error();
    const user=state.mode==="signin"?await linkedMicrosoftUser(db,profile.id):currentUser;
    if(!user || user.role==="TEMP") throw new Error();
    if(state.mode==="signin") {
      const updated=await db.outlookConnection.updateMany({where:{userId:user.id,microsoftId:profile.id,refreshToken:{not:""}},data:{refreshToken,lastError:null}});
      if(!updated.count) throw new Error();
      await createSession({sub:user.id,role:user.role,name:user.name,email:user.email});
      target=new URL("/",process.env.APP_URL!);
    } else {
      await db.$transaction(async tx=>{
        const existing=await tx.outlookConnection.findUnique({where:{userId:user.id}});
        if(existing && existing.microsoftId!==profile.id) {
          if(existing.refreshToken) throw new Error();
          await tx.outlookConnection.delete({where:{userId:user.id}});
        }
        await tx.outlookConnection.upsert({where:{userId:user.id},create:{userId:user.id,microsoftId:profile.id,email:profile.mail??profile.userPrincipalName,refreshToken},update:{refreshToken,email:profile.mail??profile.userPrincipalName,lastError:null}});
      });
      target.searchParams.set("noticeType","success");target.searchParams.set("notice","Microsoft connected. Your personal lab events are syncing, and Microsoft sign-in is ready.");
    }
    after(syncConnectedOutlookCalendars);
  } catch {
    target.searchParams.set("noticeType","error");target.searchParams.set("notice","Microsoft connection was not completed. For sign-in, link Microsoft in Account using your lab password first. For connection errors, retry or contact your administrator.");
  }
  return NextResponse.redirect(target);
}
