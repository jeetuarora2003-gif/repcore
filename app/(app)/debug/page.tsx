import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const session = await getSessionContext();
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  // Test 1: Gym Users access
  const { data: gymUsers, error: guError } = await supabase
    .from("gym_users")
    .select("*");

  // Test 2: Members access
  const { count: mCount, error: mError } = await supabase
    .from("members")
    .select("*", { count: 'exact', head: true });

  // Test 3: Subscriptions access
  const { count: sCount, error: sError } = await supabase
    .from("subscriptions")
    .select("*", { count: 'exact', head: true });

  return (
    <div className="p-8 space-y-6 font-mono text-sm">
      <h1 className="text-2xl font-bold">System Diagnosis</h1>
      
      <section className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <h2 className="font-bold text-accent mb-2">Auth Context</h2>
        <pre>{JSON.stringify({ 
          userId: user?.id,
          email: user?.email,
          sessionGymId: session.gym?.id,
          sessionGymName: session.gym?.name
        }, null, 2)}</pre>
      </section>

      <section className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <h2 className="font-bold text-accent mb-2">Database Visibility (RLS)</h2>
        <div className="space-y-2">
          <p>Gym Users found: {gymUsers?.length ?? 0} (Error: {guError?.message || "none"})</p>
          <p>Members found: {mCount ?? 0} (Error: {mError?.message || "none"})</p>
          <p>Subscriptions found: {sCount ?? 0} (Error: {sError?.message || "none"})</p>
        </div>
      </section>

      <section className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <h2 className="font-bold text-accent mb-2">Raw Gym Users Data</h2>
        <pre>{JSON.stringify(gymUsers, null, 2)}</pre>
      </section>
    </div>
  );
}
