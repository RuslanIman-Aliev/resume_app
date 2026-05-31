import { resumeRouter } from "@/features/resumes/server/routers";
import { createTRPCRouter } from "../init";
import { jobApplicationRouter } from "@/features/recent-analyzer/server/routers";
import { trackerRouter } from "@/features/tracker/server/routers";

/**
 * Root application router composed of all feature routers.
 */
export const appRouter = createTRPCRouter({
  resume: resumeRouter,
  tracker: trackerRouter,
  jobApplication: jobApplicationRouter,
});

export type AppRouter = typeof appRouter;
