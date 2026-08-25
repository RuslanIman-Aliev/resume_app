import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
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
