import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";

export const resumeRouter = createTRPCRouter({
  // For uploading resume - we will save the resume info in database and trigger the analysis workflow in background using inngest, which will update the database once done. This is done to offload the analysis work from the main request thread and provide a better user experience.
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileUrl: z.string().url(),
        resumeName: z.string(),
        postedRole: z.string(),
        thumbnailUrl: z.string().optional().nullable(),
        parsedContent: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await prisma.resume.create({
        data: {
          fileName: input.fileName,
          resumeName: input.resumeName,
          postedRole: input.postedRole,
          resumeLink: input.fileUrl,
          userId: ctx.auth.user.id,
          resumePreviewLink: input.thumbnailUrl,
          parsedContent: input.parsedContent,
        },
      });
      return { resume };
    }),
  // For listing resumes in dashboard with pagination - we will fetch 6 resumes at a time and also return total count for pagination calculation on client side
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(6),
          page: z.number().min(1).default(1),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 6;
      const page = input?.page ?? 1;
      const skip = (page - 1) * limit;
      const resumes = await prisma.resume.findMany({
        where: { userId: ctx.auth.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          fileName: true,
          resumeName: true,
          postedRole: true,
          resumeLink: true,
          resumePreviewLink: true,
          createdAt: true,
          status: true,
        },
      });
      const totalCount = await prisma.resume.count({
        where: { userId: ctx.auth.user.id },
      });
      return {
        resumes,
        pagination: {
          totalCount,
          pageCount: Math.ceil(totalCount / limit),
          currentPage: page,
        },
      };
    }),
  // For resume details page - get parsed content and other resume info
  getParsedContent: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
        select: { parsedContent: true, resumeName: true, postedRole: true },
      });
      if (!resume) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
      }
      return { resume };
    }),
  // Trigger resume analysis by sending data to inngest function, which will then trigger the analysis workflow and update the database once done. This is done to offload the analysis work from the main request thread and provide a better user experience.
  triggerAnalysis: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
        select: { parsedContent: true, resumeName: true, postedRole: true },
      });
      if (!resume) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
      }

      await inngest.send({
        name: "app/resume.analyzed",
        data: {
          resumeId: input.resumeId,
          userId: ctx.auth.user.id,
          parsedContent: resume.parsedContent,
          postedRole: resume.postedRole,
          resumeName: resume.resumeName,
        },
      });
      return { success: true };
    }),
  // For results page - get analysis result for a resume
  getAnalysisResult: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      
      const analysis = await prisma.resumeAnalysis.findFirst({
        where: {
          resumeId: input.resumeId,
          resume: { userId: ctx.auth.user.id },
        },
        orderBy: { createdAt: "desc" },
        include: {
          resume: {
            select: {
              resumeName: true,
              postedRole: true,
            },
          },
        },
      });
      if (!analysis) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analysis not found",
        });
      }
      return {
        analysis: {
          ...analysis,
          strengths: analysis.strengths as string[],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          quickWins: analysis.quickWins as any[],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          improvements: analysis.improvements as any[],
        },
      };
    }),
  // For dashboard - get latest 4 analyses with resume info
  getLatest4Analyses: protectedProcedure.query(async ({ ctx }) => {
    const analyses = await prisma.resumeAnalysis.findMany({
      where: { resume: { userId: ctx.auth.user.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        overallScore: true,
        keywords: true,
        createdAt: true,
        resume: {
          select: {
            id: true,
            resumeName: true,
            postedRole: true,
            status: true,
          },
        },
      },
    });
    return { analyses };
  }),
  // For dashboard - get total count of analyses
  getAnalysesCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.resumeAnalysis.count({
      where: { resume: { userId: ctx.auth.user.id } },
    });
    return { count };
  }),
  // For improvements section - get all improvements for a resume
  getImprovements: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const analysis = await prisma.resumeAnalysis.findFirst({
        where: {
          resumeId: input.resumeId,
          resume: { userId: ctx.auth.user.id },
        },
        orderBy: { createdAt: "desc" },
        select: { improvements: true },
      });

      if (!analysis) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Analysis not found",
        });
      }

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        improvements: analysis.improvements as any[],
      };
    }),
});
