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
      const requestedPage = input?.page ?? 1;

      const totalCount = await prisma.resume.count({
        where: { userId: ctx.auth.user.id },
      });

      if (totalCount === 0) {
        return {
          resumes: [],
          pagination: { totalCount: 0, pageCount: 1, currentPage: 1 },
        };
      }

      const pageCount = Math.max(1, Math.ceil(totalCount / limit));
      const page = Math.min(Math.max(requestedPage, 1), pageCount);
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

      return {
        resumes,
        pagination: {
          totalCount,
          pageCount,
          currentPage: page,
        },
      };
    }),
  // For listing resumes in analyzer page - we will fetch all resumes without pagination as we want to show all resumes in the dropdown
  getResumesAndAnalyses: protectedProcedure.query(async ({ ctx }) => {
    const resumes = await prisma.resume.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        resumeName: true,
        postedRole: true,
        createdAt: true,
        status: true,
        analysis: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            overallScore: true,
            keywords: true,
            createdAt: true,
          },
        },
      },
    });
    return { resumes };
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
  // For dashboard - get latest analyses with resume info to show in recent analyses section on dashboard
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
  // For job match analysis - trigger job match analysis by sending data to inngest function, which will then trigger the analysis workflow and update the database once done. This is done to offload the analysis work from the main request thread and provide a better user experience.
  triggerJobMatchAnalysis: protectedProcedure
    .input(
      z.object({
        resumeId: z.string(),
        jobDescription: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const application = await prisma.jobApplication.create({
        data: {
          userId: ctx.auth.user.id,
          resumeId: input.resumeId,
          jobDescription: input.jobDescription,
          status: "TO_APPLY",
        },
        include: {
          resume: {
            select: {
              parsedContent: true,
              structuredData: true,
            },
          },
        },
      });

      const parsedContent = application.resume.parsedContent;
      const structuredData = application.resume.structuredData;

      if (!parsedContent?.trim()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Resume parsed content is required before triggering job match analysis",
        });
      }

      await inngest.send({
        name: "app/job-matched.analyzed",
        data: {
          applicationId: application.id,
          resumeId: input.resumeId,
          jobDescription: input.jobDescription,
          parsedContent: structuredData
            ? JSON.stringify(structuredData, null, 2)
            : parsedContent,
        },
      });

      return { applicationId: application.id };
    }),
  // For job match result page - get analysis result for a job application
  getJobMatchResult: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await prisma.jobApplication.findFirst({
        where: {
          id: input.applicationId,
          userId: ctx.auth.user.id,
          status: "ANALYZED",
        },
      });
      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job application not found",
        });
      }
      return { application };
    }),

  // For applying AI suggestions to the structured JSON resume
  applyImprovement: protectedProcedure
    .input(
      z.object({
        resumeId: z.string(),
        targetSection: z.enum([
          "summary",
          "experience",
          "education",
          "projects",
          "skills",
        ]),
        targetId: z.string().optional(),
        previousText: z.string().optional(),
        newText: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
      });

      if (!resume || !resume.structuredData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume or structured data not found",
        });
      }

      // 1. Parse JSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = resume.structuredData as any;
      let changed = false;

      // 2. Precisely edit the fragment
      if (input.targetSection === "summary" && data.personalInfo) {
        if (data.personalInfo.summary !== input.newText) {
          data.personalInfo.summary = input.newText;
          changed = true;
        }
      }

      if (
        input.targetSection === "experience" &&
        input.targetId &&
        Array.isArray(data.experience)
      ) {
        for (const exp of data.experience) {
          if (exp.id === input.targetId && exp.role !== input.newText) {
            exp.role = input.newText;
            changed = true;
          }
          if (Array.isArray(exp.bullets)) {
            for (const bullet of exp.bullets) {
              if (
                bullet.id === input.targetId &&
                bullet.text !== input.newText
              ) {
                bullet.text = input.newText;
                changed = true;
              }
            }
          }
        }
      }

      if (
        input.targetSection === "education" &&
        input.targetId &&
        Array.isArray(data.education)
      ) {
        for (const edu of data.education) {
          if (edu.id === input.targetId && edu.degree !== input.newText) {
            edu.degree = input.newText;
            changed = true;
          }

          if (Array.isArray(edu.bullets)) {
            for (const bullet of edu.bullets) {
              if (
                bullet.id === input.targetId &&
                bullet.text !== input.newText
              ) {
                bullet.text = input.newText;
                changed = true;
              }
            }
          }
        }
      }

      if (
        input.targetSection === "projects" &&
        input.targetId &&
        Array.isArray(data.projects)
      ) {
        for (const project of data.projects) {
          if (project.id === input.targetId && project.name !== input.newText) {
            project.name = input.newText;
            changed = true;
          }

          if (Array.isArray(project.bullets)) {
            for (const bullet of project.bullets) {
              if (
                bullet.id === input.targetId &&
                bullet.text !== input.newText
              ) {
                bullet.text = input.newText;
                changed = true;
              }
            }
          }
        }
      }

      if (input.targetSection === "skills") {
        const normalizedNewSkill = input.newText.trim();

        if (!Array.isArray(data.skills)) {
          data.skills = normalizedNewSkill ? [normalizedNewSkill] : [];
          changed = true;
        } else if (
          normalizedNewSkill &&
          !data.skills.some(
            (skill: string) => skill?.trim() === normalizedNewSkill,
          )
        ) {
          data.skills.push(normalizedNewSkill);
          changed = true;
        }
      }

      if (!changed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No matching target was found to update in structured resume data.",
        });
      }

      const previousText = input.previousText?.trim();
      const newText = input.newText.trim();

      let nextParsedContent = resume.parsedContent;

      if (typeof resume.parsedContent === "string") {
        if (previousText && resume.parsedContent.includes(previousText)) {
          nextParsedContent = resume.parsedContent.replace(
            previousText,
            newText,
          );
        } else if (newText && !resume.parsedContent.includes(newText)) {
          const base = resume.parsedContent.trim();
          nextParsedContent = base.length > 0 ? `${base}\n${newText}` : newText;
        }
      }

      // 3. Save back to DB
      await prisma.resume.update({
        where: { id: input.resumeId },
        data: {
          structuredData: data,
          parsedContent: nextParsedContent,
        },
      });

      return { success: true, changed: true };
    }),
});
