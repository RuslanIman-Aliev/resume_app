import { createAppError } from "@/lib/app-error";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

/**
 * tRPC router for listing and aggregating job application analysis history.
 */
export const jobApplicationRouter = createTRPCRouter({
  /**
   * Returns paginated job applications for the authenticated user.
   *
   * The response supports text filtering, score filtering, sorting, and KPI
   * aggregates for the dashboard summary cards.
   */
  getJobApplication: protectedProcedure
    .input(
      z.object({
        jobTitle: z.string().trim().max(120).optional(),
        filterScore: z.enum(["all", "high", "medium", "low"]).default("all"),
        sortBy: z.enum(["date", "score"]).default("date"),
        limit: z.number().int().min(1).max(50).default(6),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scoreFilterClause =
        input.filterScore === "high"
          ? { matchScore: { gte: 80 } }
          : input.filterScore === "medium"
            ? { matchScore: { gte: 60, lt: 80 } }
            : input.filterScore === "low"
              ? { matchScore: { lt: 60 } }
              : {};

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
        ...scoreFilterClause,
      };

      const orderBy =
        input.sortBy === "score"
          ? [{ matchScore: "desc" as const }, { updatedAt: "desc" as const }]
          : [{ updatedAt: "desc" as const }];

      const totalCount = await prisma.jobApplication.count({
        where: whereClause,
      });
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
          orderBy,
        }),

        prisma.jobApplication.aggregate({
          where: whereClause,
          _avg: { matchScore: true },
          _count: { id: true },
        }),

        prisma.jobApplication.count({
          where: {
            AND: [whereClause, { matchScore: { gte: 80 } }],
          },
        }),

        prisma.jobApplication.count({
          where: {
            AND: [whereClause, { createdAt: { gte: oneWeekAgo } }],
          },
        }),
      ]);

      const mappedApplications = applications.map((app) => {
        const { improvements, ...rest } = app;
        return {
          ...rest,
          improvementsCount: Array.isArray(improvements)
            ? improvements.length
            : 0,
        };
      });

      return {
        application: mappedApplications,
        totalAnalyses: stats._count.id,
        averageScore: stats._avg.matchScore
          ? Math.round(stats._avg.matchScore)
          : 0,
        highMatches,
        thisWeek,
        pagination: {
          totalCount,
          pageCount,
          currentPage: page,
        },
      };
    }),

  /**
   * Deletes a single job application analysis owned by the current user.
   *
   * Scope note: `TrackerPosition` has no foreign key to `JobApplication` — it
   * stores `company`/`position` as plain strings — so there is no reliable link
   * from an analysis back to a kanban card. Matching on company + title would
   * be a guess (casing, "Acme" vs "Acme Inc.", several roles at one company),
   * and a wrong guess silently destroys a position the user is actively
   * tracking. This deletes the analysis row only; the tracker card is left
   * untouched, and the confirmation dialog says so.
   */
  deleteJobApplication: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // deleteMany scopes by the non-unique userId and returns a count rather
      // than throwing, so another user's id reads as NOT_FOUND instead of
      // confirming that the row exists.
      const result = await prisma.jobApplication.deleteMany({
        where: {
          id: input.applicationId,
          userId: ctx.auth.user.id,
        },
      });

      if (result.count === 0) {
        throw createAppError({
          code: "NOT_FOUND",
          message: "Analysis not found",
        });
      }

      return { success: true };
    }),
});
