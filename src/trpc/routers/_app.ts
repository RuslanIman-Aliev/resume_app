import { resumeRouter } from '@/features/resumes/server/routers';
import { createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  resume: resumeRouter,
});


export type AppRouter = typeof appRouter;