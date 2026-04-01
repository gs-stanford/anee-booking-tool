const appUrl = process.env.APP_URL?.replace(/\/$/, "");
const token = process.env.REMINDER_JOB_TOKEN;

if (!appUrl || !token) {
  console.error("APP_URL or REMINDER_JOB_TOKEN is not configured.");
  process.exit(1);
}

const response = await fetch(`${appUrl}/api/reminders/unavailability`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Reminder trigger failed: ${response.status} ${body}`);
  process.exit(1);
}

const result = await response.json();
console.log(JSON.stringify(result));
