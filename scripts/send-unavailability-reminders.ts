import "dotenv/config";

import { PrismaClient, InstrumentStatus } from "@prisma/client";

import { getLabDateKey, getLabTimeZone } from "../src/lib/lab-time";
import { isMailConfigured, sendEmail } from "../src/lib/mail";

const prisma = new PrismaClient();

function buildInstrumentUrl(instrumentId: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  return appUrl ? `${appUrl}/instruments/${instrumentId}` : null;
}

async function main() {
  if (!isMailConfigured()) {
    console.log("Skipping reminder send because SMTP is not configured.");
    return;
  }

  const todayKey = getLabDateKey(new Date());
  const dueInstruments = await prisma.instrument.findMany({
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

  if (instrumentsToRemind.length === 0) {
    console.log("No overdue unavailable instruments found.");
    return;
  }

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

    await prisma.instrument.update({
      where: {
        id: instrument.id
      },
      data: {
        unavailableReminderSentAt: new Date()
      }
    });

    console.log(`Sent reminder for ${instrument.name} to ${instrument.owner.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
