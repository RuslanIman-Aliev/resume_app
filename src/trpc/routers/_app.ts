import { resumeRouter } from '@/features/resumes/server/routers';
import { createTRPCRouter } from '../init';
import { jobApplicationRouter } from '@/features/recent-analyzer/server/routers';

export const appRouter = createTRPCRouter({
  resume: resumeRouter,
  jobApplication: jobApplicationRouter,
});


export type AppRouter = typeof appRouter;