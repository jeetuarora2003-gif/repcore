export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-hero-grid bg-hero-grid">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-10">{children}</div>
    </main>
  );
}
