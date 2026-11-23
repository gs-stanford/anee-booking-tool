import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {db} from "../src/lib/db";
import {saveCalendarBooking} from "../src/lib/calendar-booking";
import {calendarInviteRecipients,setInvitationApproval} from "../src/lib/calendar-invitations";
import {personalCalendarEvents} from "../src/lib/personal-calendar";
async function main() {
  assert.equal(process.env.DATABASE_URL,"file:/private/tmp/lab-calendar-test.db");
  const stamp=Date.now();
  const owner=await db.user.create({data:{name:"Organizer",email:`invite-owner-${stamp}@example.test`,passwordHash:"test"}});
  const guest=await db.user.create({data:{name:"Guest",email:`invite-guest-${stamp}@example.test`,passwordHash:"test"}});
  const raw={kind:"meeting",title:"Invitation gating",startDate:"2027-01-20",endDate:"2027-01-20",startTime:"10:00",endTime:"11:00",invitationsEdited:"on",inviteeIds:[guest.id]};
  try {
    process.env.OUTLOOK_CLIENT_ID="test";process.env.OUTLOOK_CLIENT_SECRET="test";process.env.OUTLOOK_TENANT_ID="test";process.env.APP_URL="https://lab.example.test";process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY=randomBytes(32).toString("base64");
    delete process.env.OUTLOOK_INVITES_ENABLED;
    assert.deepEqual(await calendarInviteRecipients(db),[]);
    await assert.rejects(saveCalendarBooking(db,owner,raw),/not enabled/);
    process.env.OUTLOOK_INVITES_ENABLED="true";
    await assert.rejects(saveCalendarBooking(db,owner,raw),/approved members/);
    for(const user of [owner,guest]) await db.outlookConnection.create({data:{userId:user.id,microsoftId:`invite-${user.id}`,email:user.email,refreshToken:"test"}});
    await assert.rejects(setInvitationApproval(db,{role:"ADMIN"},guest.id,true),/successful sync/);
    await db.outlookConnection.updateMany({where:{userId:{in:[owner.id,guest.id]}},data:{lastSyncedAt:new Date()}});
    await assert.rejects(setInvitationApproval(db,owner,guest.id,true),/Only lab admins/);
    assert.equal((await calendarInviteRecipients(db)).some(u=>u.id===guest.id),false);
    for(const user of [owner,guest]) await setInvitationApproval(db,{role:"ADMIN"},user.id,true);
    const eligible=await calendarInviteRecipients(db);
    assert(eligible.some(u=>u.id===owner.id),"organizer remains eligible when someone else invites them");
    assert(eligible.some(u=>u.id===guest.id));
    await saveCalendarBooking(db,owner,raw);
    const event=await db.labEvent.findFirstOrThrow({where:{ownerId:owner.id}});
    assert((await personalCalendarEvents(db,guest.id)).some(e=>e.key===`event:${event.id}`));
    delete process.env.OUTLOOK_INVITES_ENABLED;
    const {invitationsEdited:_,inviteeIds:__,...withoutControls}=raw;void _;void __;
    await saveCalendarBooking(db,owner,{...withoutControls,title:"Edited while hidden"},{id:event.id,version:event.version});
    assert.equal(await db.labEventInvite.count({where:{eventId:event.id,userId:guest.id}}),1,"hidden controls preserve invite records");
    assert.equal((await personalCalendarEvents(db,guest.id)).some(e=>e.key===`event:${event.id}`),false,"rollout gate blocks invited exports");
    assert((await personalCalendarEvents(db,owner.id)).some(e=>e.key===`event:${event.id}`),"owned events still sync");
    process.env.OUTLOOK_INVITES_ENABLED="true";
    await setInvitationApproval(db,{role:"ADMIN"},guest.id,false);
    assert.equal((await personalCalendarEvents(db,guest.id)).some(e=>e.key===`event:${event.id}`),false);
    await assert.rejects(saveCalendarBooking(db,owner,raw),/approved members/);
    await setInvitationApproval(db,{role:"ADMIN"},guest.id,true);
    await db.outlookConnection.update({where:{userId:guest.id},data:{refreshToken:""}});
    assert.equal((await calendarInviteRecipients(db)).some(u=>u.id===guest.id),false);
    await assert.rejects(saveCalendarBooking(db,owner,raw),/approved members/);
    console.log("PASS: invitation rollout gate, connected/synced/admin-approved eligibility, server validation, organizer eligibility, hidden-edit preservation, revoked/disconnected exclusion, and owned-event sync unaffected.");
  } finally {await db.user.deleteMany({where:{id:{in:[owner.id,guest.id]}}});await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
