import prisma from "@/lib/db";
import { applicationStatusValues, trackerFormSchema } from "@/lib/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const trackerRouter = createTRPCRouter({
  create: protectedProcedure
    .input(trackerFormSchema)
    .mutation(async ({ ctx, input }) => {
      const newApplication = await prisma.trackerPosition.create({
        data: {
          userId: ctx.auth.user.id,
          company: input.company,
          position: input.position,
          location: input.location,
          salary: input.salary,
          status: input.status,
          url: input.url,
          notes: input.notes,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
        },
      });
      return newApplication;
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const applications = await prisma.trackerPosition.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return applications;
  }),
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(applicationStatusValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedApplication = await prisma.trackerPosition.update({
        where: { id: input.id, userId: ctx.auth.user.id },
        data: { status: input.status },
      });
      return updatedApplication;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.trackerPosition.delete({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      trackerFormSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedJob = await prisma.trackerPosition.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data: {
          company: input.company,
          position: input.position,
          location: input.location,
          salary: input.salary,
          status: input.status,
          url: input.url,
          notes: input.notes,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
        },
      });

      return updatedJob;
    }),
  /**
   * Count of tracked positions per status for the dashboard pipeline bar.
   * Aggregated in Postgres so the dashboard never pulls the full list just to count.
   */
  getPipelineStats: protectedProcedure.query(async ({ ctx }) => {
    const grouped = await prisma.trackerPosition.groupBy({
      by: ["status"],
      where: { userId: ctx.auth.user.id },
      _count: { _all: true },
    });

    // Zero-fill every known status so the client can index it without guards.
    const counts = Object.fromEntries(
      applicationStatusValues.map((status) => [status, 0]),
    ) as Record<(typeof applicationStatusValues)[number], number>;

    let total = 0;
    for (const row of grouped) {
      total += row._count._all;
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row._count._all;
      }
    }

    return { counts, total };
  }),
  get4LatestTrackerJobs: protectedProcedure.query(async ({ ctx }) => {
    const latestJobs = await prisma.trackerPosition.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        company: true,
        position: true,
        location: true,
        status: true,
        createdAt: true,
        matchScore: true,
      },
    });
    return latestJobs;
  }),
  /**
   * Headline counters for the dashboard. Every tracker number comes from the
   * same groupBy that feeds the pipeline bar, so the two blocks can never
   * disagree, and it costs one round-trip instead of one count per card.
   * Counts are current-state, matching the pipeline: a position that moved on
   * to `offer` is no longer counted under `interview`.
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const [grouped, analyzed] = await Promise.all([
      prisma.trackerPosition.groupBy({
        by: ["status"],
        where: { userId: ctx.auth.user.id },
        _count: { _all: true },
      }),
      prisma.jobApplication.count({ where: { userId: ctx.auth.user.id } }),
    ]);

    const byStatus = new Map(
      grouped.map((row) => [row.status, row._count._all]),
    );
    const sum = (...statuses: (typeof applicationStatusValues)[number][]) =>
      statuses.reduce((total, status) => total + (byStatus.get(status) ?? 0), 0);

    return {
      analyzed,
      // `saved` is excluded: a bookmarked job was never applied to.
      applied: sum("applied", "screening", "interview", "offer", "rejected"),
      interviews: sum("interview"),
      offers: sum("offer"),
    };
  }),
  /**
   * Positions sitting in a live conversation stage, for the dashboard sidebar.
   * The schema has no interview date yet, so this answers "who is in play",
   * not "when" - ordered by the most recently touched.
   */
  getInterviewStagePositions: protectedProcedure.query(async ({ ctx }) => {
    const positions = await prisma.trackerPosition.findMany({
      where: {
        userId: ctx.auth.user.id,
        status: { in: ["screening", "interview"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: {
        id: true,
        company: true,
        position: true,
        status: true,
        updatedAt: true,
      },
    });
    return positions;
  }),
});
