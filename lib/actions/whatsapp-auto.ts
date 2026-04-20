"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/encryption";
import { getRemindersPipelineData } from "@/lib/db/queries";

/**
 * Core engine for sending automated WhatsApp reminders.
 * This is triggered from the Reminders page load and the low-balance banner on Dashboard.
 */
export async function sendAutoRemindersForGym(gymId: string) {
  const supabase = createSupabaseServerClient();
  
  // 1. Fetch gym config and current credit balance
  const { data: gym } = await supabase
    .from("gyms")
    .select(`
      name, 
      whatsapp_reminder_mode, 
      whatsapp_phone_number, 
      whatsapp_api_key,
      whatsapp_credits(balance_paise)
    `)
    .eq("id", gymId)
    .maybeSingle();

  if (!gym || gym.whatsapp_reminder_mode !== "auto") {
    return { skipped: "Gym not in auto mode" };
  }

  // Handle nested balance object (Supabase returns array or object depending on join)
  const creditsObj = gym.whatsapp_credits as any;
  const balancePaise = (Array.isArray(creditsObj) ? creditsObj[0]?.balance_paise : creditsObj?.balance_paise) ?? 0;

  if (balancePaise < 15) {
    return { status: "low_balance", balancePaise };
  }

  // 2. Fetch members in the 3-stage pipeline (IST-aware)
  const allPipelineMembers = await getRemindersPipelineData(gymId);
  
  // Filter for those who haven't been sent the current stage's reminder yet
  const pendingReminders = allPipelineMembers.filter((m) => {
    if (m.daysRemaining === 5 && !m.reminder5SentAt) return true;
    if (m.daysRemaining === 3 && !m.reminder3SentAt) return true;
    if (m.daysRemaining === 1 && !m.reminder1SentAt) return true;
    return false;
  });

  if (pendingReminders.length === 0) {
    return { sent: 0, skipped: "No pending reminders matching stages" };
  }

  // Decrypted API key from gyms table
  const decryptedApiKey = decrypt(gym.whatsapp_api_key ?? "");
  if (!decryptedApiKey) {
    return { error: "Decryption failed or API key missing" };
  }

  let sentCount = 0;
  let failCount = 0;
  let currentBalance = balancePaise;

  for (const member of pendingReminders) {
    // Stop if remaining balance runs out during the batch
    if (currentBalance < 15) break;

    try {
      const stage = member.daysRemaining;
      
      // AiSensy Campaign API Trigger
      const response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AiSensy-Project-API-PWD": decryptedApiKey,
        },
        body: JSON.stringify({
          apiKey: decryptedApiKey,
          campaignName: `repcore_reminder_${stage}`,
          destination: member.memberPhone.startsWith("+") ? member.memberPhone : `+91${member.memberPhone}`,
          userName: gym.name,
          templateParams: [
            member.memberName,
            gym.name,
            member.endDate,
            stage.toString()
          ],
        }),
      });

      if (response.ok) {
        // A. Update the specific reminder sent stamp on the subscription record
        const columnMap: Record<number, string> = {
          5: "reminder_5_sent_at",
          3: "reminder_3_sent_at",
          1: "reminder_1_sent_at"
        };
        
        await supabase
          .from("subscriptions")
          .update({ [columnMap[stage]]: new Date().toISOString() })
          .eq("id", member.subscriptionId);

        // B. Atomic debit and transaction log via RPC
        await supabase.rpc("deduct_gym_credits", {
          p_gym_id: gymId,
          p_amount_paise: 15,
          p_description: `Auto-reminder (${stage}d) · ${member.memberName}`,
          p_member_id: member.memberId
        });

        sentCount++;
        currentBalance -= 15;
      } else {
        const errorText = await response.text();
        console.error(`AiSensy API Failure (${member.memberName}):`, errorText);
        failCount++;
      }
    } catch (err) {
      console.error(`Engine Error (${member.memberName}):`, err);
      failCount++;
    }
  }

  return { sent: sentCount, failed: failCount };
}
