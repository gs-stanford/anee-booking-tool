import { InstrumentStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { getLabDateKey, getLabTimeZone } from "@/lib/lab-time";
import { isMailConfigured, sendEmail } from "@/lib/mail";

function buildInstrumentUrl(instrumentId: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  return appUrl ? `${appUrl}/instruments/${instrumentId}` : null;
}

export async function sendDueUnavailabilityReminders() {
  if (!isMailConfigured()) {
    return {
      sent: 0,
      skipped: "SMTP is not configured."
    };
  }

  const todayKey = getLabDateKey(new Date());
  const dueInstruments = await db.instrument.findMany({
    where: {
      status: InstrumentStatus.UNAVAILABLE,
      unavailableUntil: {
        not: null
      },
      unavailableReminderSentAt: null,
      owner: {
        is: {
          email: {
            not: ""
          }
        }
      }
    },
    include: {
      owner: true
    }
  });

  const instrumentsToRemind = dueInstruments.filter((instrument) => {
    if (!instrument.unavailableUntil || !instrument.owner?.email) {
      return false;
    }

    return getLabDateKey(instrument.unavailableUntil) <= todayKey;
  });

  for (const instrument of instrumentsToRemind) {
    if (!instrument.owner?.email) {
      continue;
    }

    const instrumentUrl = buildInstrumentUrl(instrument.id);
    const subject = `[ANEE Lab Tool] Review availability for ${instrument.name}`;
    const textLines = [
      `Hi ${instrument.owner.name},`,
      "",
      `${instrument.name} is still marked unavailable in the ANEE Lab Tool.`,
      instrument.statusNote ? `Current note: ${instrument.statusNote}` : "",
      instrument.unavailableUntil
        ? `Scheduled review date: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: getLabTimeZone() }).format(instrument.unavailableUntil)}`
        : "",
      "",
      "Please review the instrument and either mark it back available or extend the unavailable-until date.",
      instrumentUrl ? `Open instrument: ${instrumentUrl}` : "",
      "",
      "ANEE Lab Internal Tool"
    ].filter(Boolean);

    await sendEmail({
      to: instrument.owner.email,
      subject,
      text: textLines.join("\n")
    });

    await db.instrument.update({
      where: {
        id: instrument.id
      },
      data: {
        unavailableReminderSentAt: new Date()
      }
    });
  }

  return {
    sent: instrumentsToRemind.length,
    skipped: null
  };
}
