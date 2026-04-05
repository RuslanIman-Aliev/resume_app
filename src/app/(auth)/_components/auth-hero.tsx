"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const heroContent = {
  signIn: {
    title: "Welcome back",
    description:
      "Track applications, polish your CV, and stay ahead of the hiring wave.",
    items: [
      {
        text: "Smart resume analysis and feedback",
        dotClass: "bg-emerald-400",
      },
      {
        text: "AI coaching sessions tailored to your goals",
        dotClass: "bg-cyan-400",
      },
      {
        text: "Track every application in one focused workspace",
        dotClass: "bg-sky-400",
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
        dotClass: "bg-emerald-400",
      },
      {
        text: "AI coach plans for interviews and outreach",
        dotClass: "bg-cyan-400",
      },
      {
        text: "Keep every opportunity organized and visible",
        dotClass: "bg-sky-400",
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
    <div className="hidden lg:block">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
        AI Tailor
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground">
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
                "h-2 w-2 rounded-full",
                item.dotClass,
                index === 0 &&
                  "motion-safe:animate-[glow_5s_ease-in-out_infinite]",
              )}
            />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
