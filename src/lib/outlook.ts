import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { personalCalendarEvents, type PersonalEvent } from "@/lib/personal-calendar";
import { getLabDateKey, getLabTimeKey } from "@/lib/lab-time";
const scopes=()=>`offline_access User.Read Calendars.ReadWrite${process.env.OUTLOOK_TEAMS_ENABLED==="true"?" OnlineMeetings.ReadWrite":""}`;
export function teamsConfigured() { return outlookConfigured() && process.env.OUTLOOK_TEAMS_ENABLED === "true"; }
export function outlookConfigured() { return Boolean(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET && process.env.OUTLOOK_TENANT_ID && Buffer.from(process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY??"","base64").length===32 && process.env.APP_URL); }
function encryptionKey() {
  const key=Buffer.from(process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY??"","base64");
  if(key.length!==32) throw new Error("Outlook encryption is not configured.");
  return key;
}
export function sealOutlook(value:string) {
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");
}
export function openOutlook(value:string) {
  const data=Buffer.from(value,"base64url"), decipher=createDecipheriv("aes-256-gcm",encryptionKey(),data.subarray(0,12));
  decipher.setAuthTag(data.subarray(12,28));
  return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString("utf8");
}
export function outlookRedirectUri() { return `${process.env.APP_URL!.replace(/\/$/,"")}/api/outlook/callback`; }
const authority=()=>`https://login.microsoftonline.com/${encodeURIComponent(process.env.OUTLOOK_TENANT_ID!)}/oauth2/v2.0`;
export function outlookAuthorizeUrl(state:string,verifier:string) {
  const query=new URLSearchParams({client_id:process.env.OUTLOOK_CLIENT_ID!,response_type:"code",redirect_uri:outlookRedirectUri(),response_mode:"query",scope:scopes(),state,code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256",prompt:"select_account"});
  return `${authority()}/authorize?${query}`;
}
export async function outlookTokens(params:Record<string,string>) {
  const response=await fetch(`${authority()}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:process.env.OUTLOOK_CLIENT_ID!,client_secret:process.env.OUTLOOK_CLIENT_SECRET!,scope:scopes(),...params}),signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error("Microsoft authorization expired or was denied. Reconnect Outlook.");
  const value=await response.json() as {access_token:string;refresh_token?:string};
  if(!value.access_token) throw new Error("Microsoft did not return an access token.");
  return value;
}
export class GraphError extends Error { constructor(public status:number) {super(status===429 ? "Microsoft is limiting requests. Sync will retry." : "Outlook sync failed. Retry or reconnect your account.");} }
export async function outlookGraph(token:string,path:string,method="GET",body?:unknown) {
  const response=await fetch(`https://graph.microsoft.com/v1.0${path}`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:'IdType="ImmutableId"'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new GraphError(response.status);
  return response.status===204 ? null : response.json();
}
export function outlookEventBody(event:PersonalEvent) {
  const allDay=getLabTimeKey(event.startAt)==="00:00" && getLabTimeKey(event.endAt)==="00:00";
  const date=(value:Date)=>allDay?{dateTime:`${getLabDateKey(value)}T00:00:00`,timeZone:"Pacific Standard Time"}:{dateTime:value.toISOString().replace(/Z$/,""),timeZone:"UTC"};
  return {subject:event.title,body:{contentType:"text",content:`${event.notes}\n\nManage this booking at ${process.env.APP_URL??"https://lab.amboies.com"}`},location:{displayName:event.location},start:date(event.startAt),end:date(event.endAt),isAllDay:allDay,showAs:"busy"};
}
export async function syncTeamsMeetings(userId:string,token:string,now=new Date()) {
  if(!teamsConfigured()) return;
  const existing=await db.outlookMeeting.findMany({where:{userId},include:{event:true}});
  for (const old of existing.filter(item=>!item.event || !item.event.teamsEnabled)) {
    try { await outlookGraph(token,`/me/onlineMeetings/${encodeURIComponent(old.remoteId)}`,"DELETE"); }
    catch(error) { if(!(error instanceof GraphError && error.status===404)) throw error; }
    await db.outlookMeeting.deleteMany({where:{id:old.id}});
  }
  const meetings=await db.labEvent.findMany({where:{ownerId:userId,teamsEnabled:true,endAt:{gt:now}}});
  for(const event of meetings) {
    if(!(await db.outlookConnection.findUnique({where:{userId},select:{refreshToken:true}}))?.refreshToken) return;
    const body={subject:event.title,startDateTime:event.startAt.toISOString(),endDateTime:event.endAt.toISOString()};
    const contentHash=createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const match=existing.find(item=>item.eventId===event.id);
    if(match?.contentHash===contentHash) continue;
    if(match) {
      await outlookGraph(token,`/me/onlineMeetings/${encodeURIComponent(match.remoteId)}`,"PATCH",body);
      await db.outlookMeeting.update({where:{id:match.id},data:{contentHash}});
    } else {
      const result=await outlookGraph(token,"/me/onlineMeetings/createOrGet","POST",{...body,externalId:`boies-lab:${event.id}`});
      const url=new URL(result.joinWebUrl);
      if(url.protocol!=="https:" || !result.id) throw new Error("Microsoft returned an invalid Teams meeting.");
      // A canceled event may disappear while the network request is in flight. Keep a
      // tombstone so the next sync can delete that remote meeting as well.
      await db.$transaction(async tx=>{
        const stillExists=await tx.labEvent.findUnique({where:{id:event.id}});
        await tx.outlookMeeting.create({data:{eventId:stillExists?.id??null,userId,remoteId:result.id,joinUrl:url.toString(),contentHash}});
      });
    }
  }
}
export async function syncOutlookUser(userId:string,meetingsOnly=false) {
  if(!outlookConfigured()) return;
  const now=new Date();
  const lease=new Date(now.getTime()+10*60000);
  const acquired=await db.outlookConnection.updateMany({where:{userId,refreshToken:{not:""},OR:[{lockUntil:null},{lockUntil:{lt:now}}]},data:{lockUntil:lease}});
  if(!acquired.count) return;
  try {
    const connection=await db.outlookConnection.findUniqueOrThrow({where:{userId}});
    if (!connection.refreshToken) return;
    const tokens=await outlookTokens({grant_type:"refresh_token",refresh_token:openOutlook(connection.refreshToken)});
    if(tokens.refresh_token) await db.outlookConnection.updateMany({where:{userId,refreshToken:{not:""}},data:{refreshToken:sealOutlook(tokens.refresh_token)}});
    let teamsError:string|null=null;
    try { await syncTeamsMeetings(userId,tokens.access_token,now); }
    catch { teamsError="Teams meeting sync failed. Reconnect Outlook or ask your administrator to check Teams permissions and licensing."; }
    if(meetingsOnly) {
      if(teamsError) await db.outlookConnection.updateMany({where:{userId},data:{lastError:teamsError}});
      return;
    }
    let calendarId=connection.calendarId;
    if(!calendarId) {
      const calendar=await outlookGraph(tokens.access_token,"/me/calendars","POST",{name:"Boies Lab"});
      calendarId=calendar.id as string;
      await db.outlookConnection.update({where:{userId},data:{calendarId}});
    }
    const desired=await personalCalendarEvents(db,userId,now);
    const existing=await db.outlookSyncItem.findMany({where:{userId}});
    const base=`/me/calendars/${encodeURIComponent(calendarId!)}/events`;
    for(const event of desired) {
      if (!(await db.outlookConnection.findUnique({where:{userId},select:{refreshToken:true}}))?.refreshToken) return;
      const body=outlookEventBody(event);
      const contentHash=createHash("sha256").update(JSON.stringify(body)).digest("hex");
      let match=existing.find(item=>item.sourceKey===event.key);
      if(match?.contentHash===contentHash) continue;
      if(match) {
        try { await outlookGraph(tokens.access_token,`${base}/${encodeURIComponent(match.remoteId)}`,"PATCH",body); }
        catch(error) { if(error instanceof GraphError && error.status===404) match=undefined; else throw error; }
      }
      let remoteId=match?.remoteId;
      if(!remoteId) {
        const transactionId=createHash("sha256").update(`${userId}:${calendarId}:${event.key}:${contentHash}`).digest("hex");
        remoteId=(await outlookGraph(tokens.access_token,base,"POST",{...body,transactionId})).id;
      }
      await db.outlookSyncItem.upsert({where:{userId_sourceKey:{userId,sourceKey:event.key}},create:{userId,sourceKey:event.key,remoteId:remoteId!,contentHash,endAt:event.endAt},update:{remoteId:remoteId!,contentHash,endAt:event.endAt}});
    }
    if (!(await db.outlookConnection.findUnique({where:{userId},select:{refreshToken:true}}))?.refreshToken) return;
    for(const old of existing.filter(item=>item.endAt>now && !desired.some(event=>event.key===item.sourceKey))) {
      try { await outlookGraph(tokens.access_token,`${base}/${encodeURIComponent(old.remoteId)}`,"DELETE"); }
      catch(error) { if(!(error instanceof GraphError && error.status===404)) throw error; }
      await db.outlookSyncItem.delete({where:{userId_sourceKey:{userId,sourceKey:old.sourceKey}}});
    }
    await db.outlookConnection.update({where:{userId},data:{lastSyncedAt:new Date(),lastError:teamsError}});
  } catch(error) {
    if (error instanceof GraphError && error.status===404) {
      await db.$transaction([db.outlookConnection.updateMany({where:{userId},data:{calendarId:null}}),db.outlookSyncItem.deleteMany({where:{userId}})]);
    }
    await db.outlookConnection.updateMany({where:{userId},data:{lastError:error instanceof GraphError ? error.message : "Outlook sync needs attention. Retry or reconnect."}});
  } finally { await db.outlookConnection.updateMany({where:{userId,lockUntil:lease},data:{lockUntil:null}}); }
}
let syncQueue:Promise<void>=Promise.resolve();
export async function syncConnectedOutlookCalendars() {
  if(!outlookConfigured()) return;
  syncQueue=syncQueue.catch(()=>{}).then(async()=>{
    const connections=await db.outlookConnection.findMany({where:{refreshToken:{not:""}},select:{userId:true}});
    if(teamsConfigured()) for(const connection of connections) await syncOutlookUser(connection.userId,true);
    for(const connection of connections) await syncOutlookUser(connection.userId);
  });
  await syncQueue;
}
