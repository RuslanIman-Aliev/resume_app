import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const jobApplicationRouter = createTRPCRouter({
  getJobApplication: protectedProcedure
    .input(
      z.object({
        jobTitle: z.string().optional(),
        limit: z.number().default(6), 
        page: z.number().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause = {
        userId: ctx.auth.user.id,
        ...(input.jobTitle
          ? {
              OR: [
                {
                  jobTitle: {
                    contains: input.jobTitle,
                    mode: "insensitive" as const,
                  },
                },
                {
                  companyName: {
                    contains: input.jobTitle,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      };

      const totalCount = await prisma.jobApplication.count({ where: whereClause });
      const limit = input.limit;
      const pageCount = Math.max(1, Math.ceil(totalCount / limit));
      const page = Math.min(Math.max(input.page, 1), pageCount);
      const skip = (page - 1) * limit;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [applications, stats, highMatches, thisWeek] = await Promise.all([
        prisma.jobApplication.findMany({
          where: whereClause,
          take: limit,
          skip,
          select: {
            id: true,
            companyName: true,
            jobTitle: true,
            status: true,
            matchScore: true,
            updatedAt: true,
            createdAt: true,
            improvements: true,
            resume: { select: { resumeName: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),

        prisma.jobApplication.aggregate({
          where: whereClause,
          _avg: { matchScore: true },
          _count: { id: true }, 
        }),

        prisma.jobApplication.count({
          where: { ...whereClause, matchScore: { gte: 80 } },
        }),

        prisma.jobApplication.count({
          where: { ...whereClause, createdAt: { gte: oneWeekAgo } },
        }),
      ]);

      const mappedApplications = applications.map((app) => {
        const { improvements, ...rest } = app;
        const improvementsCount = Array.isArray(improvements) ? improvements.length : 0;
        return {
          ...rest,
          improvementsCount,
        };
      });

      return {
        application: mappedApplications,
        totalAnalyses: stats._count.id,
        averageScore: stats._avg.matchScore ? Math.round(stats._avg.matchScore) : 0,
        highMatches,
        thisWeek,
        pagination: {
          totalCount,
          pageCount,
          currentPage: page,
        },
      };
    }),
});