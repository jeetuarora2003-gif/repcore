import { getSessionContext } from "@/lib/auth/session";
import { getWhatsappSettingsData } from "@/lib/db/queries";
import { redirect } from "next/navigation";
import WhatsappSettingsClient from "@/components/settings/whatsapp-settings-client";

export const dynamic = "force-dynamic";

export default async function WhatsappSettingsPage() {
  const session = await getSessionContext();
  
  if (session.gymUser?.role !== "owner") {
    redirect("/dashboard");
  }

  const gymId = session.gym!.id;
  const data = await getWhatsappSettingsData(gymId);

  return (
    <WhatsappSettingsClient 
      gym={data.gym}
      balance={data.balance}
      transactions={data.transactions}
      razorpayKey={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
    />
  );
}
