"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const heroContent = {
  signIn: {
    title: "Welcome back",
    description:
      "Track applications, polish your CV, and stay ahead of the hiring wave.",
    items: [
      {
        text: "Smart resume analysis and feedback",
        dotClass: "bg-zinc-200",
      },
      {
        text: "AI coaching sessions tailored to your goals",
        dotClass: "bg-zinc-400",
      },
      {
        text: "Track every application in one focused workspace",
        dotClass: "bg-zinc-600",
      },
    ],
  },
  signUp: {
    title: "Create your account",
    description:
      "Build a smarter job search flow with structured tracking and AI-powered insight.",
    items: [
      {
        text: "Personalized resume and application dashboards",
        dotClass: "bg-zinc-200",
      },
      {
        text: "AI coach plans for interviews and outreach",
        dotClass: "bg-zinc-400",
      },
      {
        text: "Keep every opportunity organized and visible",
        dotClass: "bg-zinc-600",
      },
    ],
  },
};

export function AuthHero() {
  const pathname = usePathname() || "";
  const content = pathname.includes("/signup")
    ? heroContent.signUp
    : heroContent.signIn;

  return (
    <div className="relative hidden lg:block">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 top-8 h-36 w-36 rounded-full bg-white/8 blur-3xl"
      />
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200/85 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur">
        AI Tailor
      </div>
      <h1 className="mt-6 bg-linear-to-r from-zinc-100 via-white to-zinc-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
        {content.title}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {content.description}
      </p>
      <div className="mt-8 space-y-3 text-sm text-muted-foreground">
        {content.items.map((item, index) => (
          <div key={item.text} className="flex items-center gap-3">
            <span
              className={cn(
                "h-2 w-2 rounded-full ring-1 ring-white/15",
                item.dotClass,
                index === 0 &&
                  "shadow-[0_0_14px_rgba(255,255,255,0.35)] motion-safe:animate-[glow_5s_ease-in-out_infinite]",
              )}
            />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
