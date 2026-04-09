import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "master_admin_log.csv");

/**
 * Appends a row to the master admin log.
 * Data is stored in CSV format which can be opened directly in Excel.
 */
export function logAdminAction(event: "login" | "signup" | "onboarding", details: Record<string, unknown>) {
  try {
    const timestamp = new Date().toISOString();
    const email = details.email || "";
    
    // Create file with headers if it doesn't exist
    if (!fs.existsSync(LOG_FILE)) {
      const headers = ["timestamp", "event", "email", "name", "gym_name", "phone"];
      fs.writeFileSync(LOG_FILE, headers.join(",") + "\n");
    }

    // Check for duplicates
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    const lines = content.split("\n");
    const isDuplicate = lines.some(line => {
      const parts = line.split(",");
      // Check if event (index 1) and email (index 2) match
      // Note: Parts are wrapped in quotes in our storage format
      return parts[1] === `"${event}"` && parts[2] === `"${email}"`;
    });

    if (isDuplicate) return;

    const row = [
      timestamp,
      event,
      email,
      details.fullName || details.name || "",
      details.gymName || "",
      details.phone || ""
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");

    fs.appendFileSync(LOG_FILE, row + "\n");
  } catch (err) {
    console.error("Failed to log admin action:", err);
    // Non-blocking, we don't want to crash the app if logging fails
  }
}
