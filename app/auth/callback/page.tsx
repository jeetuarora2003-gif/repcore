export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-accent to-white bg-clip-text text-transparent">
          Callback works
        </h1>
        <p className="mt-2 text-muted-foreground italic">
          Routing for /auth/callback is active.
        </p>
      </div>
    </div>
  );
}
