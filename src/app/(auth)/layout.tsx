import type { ReactNode } from "react";
import { AuthHero } from "@/app/(auth)/_components/auth-hero";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1000px_600px_at_10%_10%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(800px_500px_at_90%_20%,rgba(16,185,129,0.2),transparent_60%),linear-gradient(180deg,rgba(10,15,26,1),rgba(8,10,20,1))]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-[-10%] h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl motion-safe:animate-[float_11s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-[-10%] h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl motion-safe:animate-[float_13s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.33]"
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <AuthHero />

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
}
