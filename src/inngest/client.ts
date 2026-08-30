import { serverEnv } from "@/lib/env.server";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
  // The SDK would read `INNGEST_SIGNING_KEY` from the environment by itself.
  // Taking it from `env.server` instead means a production deploy without the
  // key fails at startup, rather than serving `/api/inngest` that rejects
  // every event Inngest delivers - which looks like jobs silently never running.
  signingKey: serverEnv.INNGEST_SIGNING_KEY,
});
