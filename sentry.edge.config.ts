// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://1e04ea6c0b04b72ca68d8ab615b6ea08@o4510795371839488.ingest.de.sentry.io/4511044262166608",

  // Sampled in production rather than the default 1: at 100% every request
  // spends quota, and a single traffic spike burns the month's allowance.
  // Development stays at full sampling, where the volume is a handful of
  // requests and a missing trace is what hurts.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Personally identifiable information is deliberately not sent. Resume text
  // reaching Sentry would carry names, phone numbers, addresses and full
  // employment history, which the project rule in CLAUDE.md forbids logging.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
