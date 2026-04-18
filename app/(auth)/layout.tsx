import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-hero-grid bg-hero-grid">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-5 py-10">
        <Logo size="lg" showTagline />
        {children}
      </div>
    </main>
  );
}
