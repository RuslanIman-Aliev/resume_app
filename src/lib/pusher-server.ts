import "server-only";

import { serverEnv } from "@/lib/env.server";
import Pusher from "pusher";

/**
 * Builds a server-side Pusher client.
 *
 * Constructed per call rather than at module scope so the credentials are read
 * through `serverEnv`, which fails fast at import time if any are missing.
 * Shared by the Inngest jobs that publish analysis events and by the endpoint
 * that signs private-channel subscriptions.
 */
export const createPusherServer = () =>
  new Pusher({
    appId: serverEnv.PUSHER_APP_ID,
    key: serverEnv.PUSHER_APP_KEY,
    secret: serverEnv.PUSHER_APP_SECRET,
    cluster: serverEnv.PUSHER_APP_CLUSTER,
    useTLS: true,
  });
