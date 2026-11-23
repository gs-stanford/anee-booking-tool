import { Prisma, Role } from "@prisma/client";
import { outlookConfigured } from "@/lib/outlook";
export function calendarInvitationsEnabled() {
  return outlookConfigured() && process.env.OUTLOOK_INVITES_ENABLED === "true";
}
export const approvedInviteRecipientWhere: Prisma.UserWhereInput = {
  role: {not: Role.TEMP},
  outlookConnection: {is: {invitesApproved: true, refreshToken: {not: ""}, lastSyncedAt: {not: null}}}
};
export async function calendarInviteRecipients(client:Pick<Prisma.TransactionClient,"user">) {
  if (!calendarInvitationsEnabled()) return [];
  return client.user.findMany({where:approvedInviteRecipientWhere,select:{id:true,name:true},orderBy:{name:"asc"}});
}
export async function setInvitationApproval(client:Prisma.TransactionClient,actor:{role:Role},userId:string,approved:boolean) {
  if(actor.role!==Role.ADMIN) throw new Error("Only lab admins can approve invitation recipients.");
  const result=await client.outlookConnection.updateMany({where:{userId,...(approved?{refreshToken:{not:""},lastSyncedAt:{not:null},user:{role:{not:Role.TEMP}}}:{})},data:{invitesApproved:approved}});
  if(!result.count) throw new Error("The user must connect Outlook and complete a successful sync before approval.");
}
