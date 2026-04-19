import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://1e04ea6c0b04b72ca68d8ab615b6ea08@o4510795371839488.ingest.de.sentry.io/4511044262166608",
  // Tracing must be enabled for agent monitoring to work
  tracesSampleRate: 1.0,
  // Add data like inputs and responses to/from LLMs and tools;
  // see https://docs.sentry.io/platforms/javascript/data-management/data-collected/ for more info
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
