import "dotenv/config";

import { sendDueUnavailabilityReminders } from "../src/lib/unavailability-reminders";

async function main() {
  const result = await sendDueUnavailabilityReminders();

  if (result.skipped) {
    console.log(`Skipping reminder send because ${result.skipped}`);
    return;
  }

  console.log(`Sent ${result.sent} unavailability reminder${result.sent === 1 ? "" : "s"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
