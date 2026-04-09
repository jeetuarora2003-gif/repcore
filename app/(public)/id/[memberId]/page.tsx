import { notFound } from "next/navigation";
import { getPublicMemberCardData } from "@/lib/db/queries";
import { DigitalIdCard } from "@/components/members/digital-id-card";

export default async function PublicIdCardPage({
  params,
}: {
  params: { memberId: string };
}) {
  const member = await getPublicMemberCardData(params.memberId);

  if (!member) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#050505]">
      <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <DigitalIdCard member={member} />
      </div>
      
      <div className="mt-12 text-center space-y-4">
        <p className="text-xs font-medium text-white/40 uppercase tracking-[0.3em]">
          Verified by RepCore Smart Systems
        </p>
        <div className="flex justify-center gap-6">
            {/* Add helpful links for the member? */}
        </div>
      </div>
    </main>
  );
}
