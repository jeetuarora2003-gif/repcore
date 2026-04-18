/**
 * Logs important admin actions.
 * In production (Vercel), these logs are captured by the persistent logging dashboard.
 */
export function logAdminAction(event: "login" | "signup" | "onboarding", details: Record<string, unknown>) {
  try {
    const timestamp = new Date().toISOString();
    const email = details.email || "unknown@user.com";
    
    // Log structured event to stdout for Vercel/CloudWatch/Datadog collection
    console.log(`[ADMIN_ACTION] [${timestamp}] EVENT: ${event} | EMAIL: ${email} | DETAILS: ${JSON.stringify(details)}`);

  } catch (err) {
    // Non-blocking, we don't want to crash the app if logging fails
    console.error("Failed to log admin action:", err);
  }
}
