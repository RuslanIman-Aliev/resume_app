import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://1e04ea6c0b04b72ca68d8ab615b6ea08@o4510795371839488.ingest.de.sentry.io/4511044262166608",
  // Tracing must be enabled for agent monitoring to work
  // Sampled in production rather than the default 1: at 100% every request
  // spends quota, and a single traffic spike burns the month's allowance.
  // Development stays at full sampling, where the volume is a handful of
  // requests and a missing trace is what hurts.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Left off on purpose: with it enabled Sentry attaches request bodies and LLM
  // inputs/outputs, which on this app means the full text of a user's resume.
  // see https://docs.sentry.io/platforms/javascript/data-management/data-collected/ for more info
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
