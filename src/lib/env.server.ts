import "server-only";

import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Inngest's dev server signs nothing, so a local run has no key to validate.
 * `INNGEST_DEV` is what switches the SDK into that mode.
 */
const usesInngestDevServer =
  process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true";

/**
 * Marks a variable as required in a production build and optional elsewhere.
 *
 * Used for the secrets that have a working local fallback (Better Auth signs
 * dev sessions with a built-in key, Inngest's dev server skips signatures) but
 * no acceptable production fallback - a deploy missing one of them should fail
 * at startup rather than on the first request that needs it.
 */
const requiredInProduction = (schema: z.ZodString, required = isProduction) =>
  required ? schema : schema.optional();

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Signs session cookies. Better Auth refuses to fall back to its built-in
  // development key outside development, so a production deploy without this
  // has no working sign-in at all.
  BETTER_AUTH_SECRET: requiredInProduction(z.string().min(1)),
  // The origin Better Auth builds callback and email links from. A wrong or
  // missing value sends password-reset links to the wrong host.
  BETTER_AUTH_URL: requiredInProduction(z.string().url()),
  // Verifies that requests to `/api/inngest` really come from Inngest. Without
  // it the route rejects every event, which used to surface as background jobs
  // silently never running.
  INNGEST_SIGNING_KEY: requiredInProduction(
    z.string().min(1),
    isProduction && !usesInngestDevServer,
  ),
  // Transactional email (password reset, address verification). Optional: the
  // app runs without it, and `sendEmail` logs the link in development instead
  // of sending it. In production an unset key makes password reset fail loudly
  // rather than quietly pretending to have sent something.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("AI-Tailor <onboarding@resend.dev>"),
  OPENAI_API_KEY: z.string().min(1),
  // Defaulted rather than required: the model is a tuning knob, not a
  // credential, and an unset value should keep the app booting on the model
  // the analysis prompts were written against.
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4"),
  CONVERT_API_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://ai-tailor.app"),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_APP_KEY: z.string().min(1),
  PUSHER_APP_SECRET: z.string().min(1),
  PUSHER_APP_CLUSTER: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DOCUMENT_EDITOR_SERVICE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SYNCFUSION_LICENSE: z.string().optional(),
});

const parsedEnv = serverEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables:\n${parsedEnv.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")}`,
  );
}

export const serverEnv = parsedEnv.data;
