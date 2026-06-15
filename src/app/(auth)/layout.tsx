import { AuthHero } from "@/app/(auth)/_components/auth-hero";
import { AuthInteractiveGlow } from "@/app/(auth)/_components/auth-interactive-glow";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1300px_560px_at_50%_-8%,rgba(255,255,255,0.2),transparent_60%),radial-gradient(920px_540px_at_12%_18%,rgba(255,255,255,0.07),transparent_62%),radial-gradient(860px_520px_at_88%_20%,rgba(255,255,255,0.05),transparent_64%),linear-gradient(180deg,rgba(0,0,0,1),rgba(4,4,4,1)_45%,rgba(10,10,10,1))]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-36 left-[-12%] h-80 w-80 rounded-full bg-white/14 blur-3xl motion-safe:animate-[float_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-[-12%] h-96 w-96 rounded-full bg-zinc-400/18 blur-3xl motion-safe:animate-[float_14s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-28%] top-[-22%] h-80 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.14)_50%,transparent_70%)] opacity-35 blur-2xl motion-safe:animate-[shimmer_10s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[52%] h-96 w-152 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent_70%)] opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[56%] h-80 w-lg -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_70%)] opacity-60 blur-2xl motion-safe:animate-[glow_7s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] top-[44%] h-40 bg-[linear-gradient(105deg,transparent_18%,rgba(255,255,255,0.2)_50%,transparent_82%)] opacity-40 blur-2xl motion-safe:animate-[shimmer_9s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-size-[24px_24px] opacity-[0.14] mask-[radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_120%,rgba(0,0,0,0.92),transparent_58%)]"
      />
      <AuthInteractiveGlow />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <AuthHero />

        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </div>
  );
}
