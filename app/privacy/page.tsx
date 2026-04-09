export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-20">
      <h1 className="text-4xl font-bold">Privacy Policy</h1>
      <div className="mt-10 space-y-6 text-muted-foreground">
        <p>Your privacy is important to us. RepCore is built to manage your gym data securely.</p>
        <h2 className="text-xl font-semibold text-foreground">Data Collection</h2>
        <p>We collect member names, phone numbers, and payment records strictly for gym management purposes.</p>
        <h2 className="text-xl font-semibold text-foreground">Data Security</h2>
        <p>Your data is stored in encrypted Supabase instances located in secure data centers.</p>
      </div>
    </main>
  );
}
