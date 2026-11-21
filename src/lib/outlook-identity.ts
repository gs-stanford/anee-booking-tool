import { timingSafeEqual } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { openOutlook } from "@/lib/outlook";
export type OutlookState = {mode:"connect"|"signin";state:string;verifier:string;userId?:string;expires:number};
export function validateOutlookState(raw:string,received:string,currentUserId?:string):OutlookState {
  const state=JSON.parse(openOutlook(raw)) as OutlookState;
  if (!state.state || !state.verifier || !Number.isFinite(state.expires) || state.expires<Date.now() ||
      !["connect","signin"].includes(state.mode) ||
      (state.mode==="connect" && (!currentUserId || state.userId!==currentUserId)) ||
      Buffer.byteLength(received)!==Buffer.byteLength(state.state) ||
      !timingSafeEqual(Buffer.from(received),Buffer.from(state.state))) throw new Error("Invalid Microsoft sign-in state.");
  return state;
}
export async function linkedMicrosoftUser(client:PrismaClient,microsoftId:string) {
  if (!microsoftId) throw new Error("Microsoft identity is missing.");
  const connection=await client.outlookConnection.findUnique({where:{microsoftId},include:{user:true}});
  if (!connection?.refreshToken || connection.user.role==="TEMP") throw new Error("Sign in with your lab password and link Microsoft in Account first.");
  return connection.user;
}
