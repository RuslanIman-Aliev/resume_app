import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import {
  normalizeResumeParsedContent,
  updateResumeParsedContent,
} from "@/lib/resume-content";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";

/**
 * tRPC router for resume lifecycle operations, including uploads,
 * analysis, job matching, and structured content updates.
 */
export const resumeRouter = createTRPCRouter({
  /**
   * Creates a resume record for the authenticated user.
   *
   * Persists upload metadata, the public file URL, and optional parsed
   * content for downstream analysis workflows.
   */
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string().trim().min(1).max(255),
        fileUrl: z.string().url(),
        resumeName: z.string().trim().min(1).max(120),
        postedRole: z.string().trim().min(1).max(120),
        thumbnailUrl: z.string().optional().nullable(),
        parsedContent: z.string().max(300_000).optional().nullable(),
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
          parsedContent: normalizeResumeParsedContent(input.parsedContent),
        },
      });
      return { resume };
    }),
  /**
   * Returns a paginated list of the authenticated user's resumes.
   *
   * The response includes pagination metadata and clamps out-of-range page
   * values to the nearest valid page.
   */
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
  /**
   * Returns all user-owned resumes together with their latest analyses.
   *
   * This is used by the analyzer selector to let the user pick a resume and
   * inspect its most recent scoring data.
   */
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
  /**
   * Returns parsed resume content and basic metadata for a specific resume.
   *
   * The resume must belong to the authenticated user.
   */
  getParsedContent: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
        select: {
          parsedContent: true,
          resumeName: true,
          postedRole: true,
          resumeLink: true,
        },
      });
      if (!resume) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
      }
      return { resume };
    }),
  /**
   * Triggers asynchronous resume analysis for a user-owned resume.
   *
   * The job is dispatched to Inngest after ownership is verified.
   */
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
  /**
   * Returns the latest completed analysis for a specific user-owned resume.
   *
   * The analysis payload is normalized so the client receives typed arrays for
   * strengths, quick wins, and improvements.
   */
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
  /**
   * Returns the four most recent analyses for the authenticated user.
   *
   * This powers the dashboard "Recent Analyses" widget.
   */
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
  /**
   * Returns the total number of analyses available to the authenticated user.
   */
  getAnalysesCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.resumeAnalysis.count({
      where: { resume: { userId: ctx.auth.user.id } },
    });
    return { count };
  }),
  /**
   * Returns AI improvement suggestions from the latest resume analysis.
   */
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
  /**
   * Creates a job application analysis task and dispatches it to Inngest.
   *
   * The resume is validated for ownership and for the presence of parsed
   * content before the asynchronous workflow starts.
   */
  triggerJobMatchAnalysis: protectedProcedure
    .input(
      z.object({
        resumeId: z.string(),
        jobDescription: z.string().trim().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownedResume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
        select: {
          parsedContent: true,
          structuredData: true,
        },
      });

      if (!ownedResume) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }

      const parsedContent = ownedResume.parsedContent;
      const structuredData = ownedResume.structuredData;

      if (!parsedContent?.trim()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Resume parsed content is required before triggering job match analysis",
        });
      }

      const application = await prisma.jobApplication.create({
        data: {
          userId: ctx.auth.user.id,
          resumeId: input.resumeId,
          jobDescription: input.jobDescription,
          status: "TO_APPLY",
        },
      });

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
  /**
   * Returns a completed job match analysis for a user-owned application.
   *
   * Only applications with an ANALYZED status are returned.
   */
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

  /**
   * Applies a single AI suggestion to structured resume JSON.
   *
   * The procedure updates the matching fragment in structured data and keeps
   * the parsed text content aligned with the edited value when possible.
   */
  applyImprovement: protectedProcedure
    .input(
      z.object({
        resumeId: z.string(),
        applicationId: z.string().optional(),
        targetSection: z.enum([
          "summary",
          "experience",
          "education",
          "projects",
          "skills",
        ]),
        targetId: z.string().trim().max(120).optional(),
        previousText: z.string().max(20_000).optional(),
        newText: z.string().trim().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
      });

      if (!resume) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }

      const previousText = input.previousText?.trim();
      const newText = input.newText.trim();

      const hasStructuredData = Boolean(resume.structuredData);
      let changed = false;

      // 1. Parse JSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = hasStructuredData ? (resume.structuredData as any) : null;

      // 2. Precisely edit the fragment
      if (
        hasStructuredData &&
        input.targetSection === "summary" &&
        data.personalInfo
      ) {
        const currentSummary = data.personalInfo.summary?.trim() ?? "";

        if (currentSummary !== newText) {
          data.personalInfo.summary = input.newText;
          changed = true;
        }
      }

      if (
        hasStructuredData &&
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
        hasStructuredData &&
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
        hasStructuredData &&
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

      if (hasStructuredData && input.targetSection === "skills") {
        const normalizedNewSkill = newText;

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

      if (hasStructuredData && !changed) {
        // If no direct match found, append the new text to the appropriate section
        if (input.targetSection === "summary" && data.personalInfo) {
          const currentSummary = data.personalInfo.summary?.trim() ?? "";

          if (currentSummary !== newText) {
            // Append to summary only when it would actually change the text.
            data.personalInfo.summary = currentSummary
              ? `${data.personalInfo.summary}\n${newText}`
              : newText;
            changed = true;
          }
        } else if (
          input.targetSection === "experience" &&
          Array.isArray(data.experience)
        ) {
          // Append to last experience bullet
          if (data.experience.length > 0) {
            const lastExp = data.experience[data.experience.length - 1];
            if (Array.isArray(lastExp.bullets)) {
              lastExp.bullets.push({
                id: `bullet-${Date.now()}`,
                text: newText,
              });
              changed = true;
            }
          }
        } else if (
          input.targetSection === "education" &&
          Array.isArray(data.education)
        ) {
          // Append to last education bullet
          if (data.education.length > 0) {
            const lastEdu = data.education[data.education.length - 1];
            if (Array.isArray(lastEdu.bullets)) {
              lastEdu.bullets.push({
                id: `bullet-${Date.now()}`,
                text: newText,
              });
              changed = true;
            }
          }
        } else if (
          input.targetSection === "projects" &&
          Array.isArray(data.projects)
        ) {
          // Append to last project bullet
          if (data.projects.length > 0) {
            const lastProject = data.projects[data.projects.length - 1];
            if (Array.isArray(lastProject.bullets)) {
              lastProject.bullets.push({
                id: `bullet-${Date.now()}`,
                text: newText,
              });
              changed = true;
            }
          }
        } else if (
          input.targetSection === "skills" &&
          Array.isArray(data.skills)
        ) {
          // Add as new skill if not exists
          if (!data.skills.includes(newText)) {
            data.skills.push(newText);
            changed = true;
          }
        }
      }

      if (hasStructuredData && !changed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No matching target was found to update in structured resume data.",
        });
      }

      const nextParsedContent = updateResumeParsedContent(
        resume.parsedContent,
        previousText,
        newText,
      );

      const updatePayload = hasStructuredData
        ? {
            structuredData: data,
            parsedContent: nextParsedContent,
          }
        : {
            // If we do not have structured data yet, still persist the text edit.
            parsedContent: nextParsedContent,
          };

      if (!hasStructuredData) {
        const normalizedCurrent = normalizeResumeParsedContent(
          resume.parsedContent,
        );
        if (nextParsedContent === normalizedCurrent) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "No matching target was found to update in parsed resume data.",
          });
        }
      }

      // 3. Save back to DB
      const updateResult = await prisma.resume.updateMany({
        where: {
          id: input.resumeId,
          userId: ctx.auth.user.id,
        },
        data: updatePayload,
      });

      if (updateResult.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }

      // 4. Mark improvement as applied in JobApplication if applicationId is provided
      if (input.applicationId) {
        const application = await prisma.jobApplication.findFirst({
          where: {
            id: input.applicationId,
            userId: ctx.auth.user.id,
          },
        });

        if (application && application.improvements) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const improvements = application.improvements as any[];
          let matchScoreBoostToApply = 0;

          const updatedImprovements = improvements.map((imp) => {
            // Mark improvement as applied if it matches the target and text
            if (
              imp.targetSection === input.targetSection &&
              imp.targetId === input.targetId &&
              imp.beforeText === input.previousText &&
              imp.afterText === input.newText
            ) {
              // Capture the matchScoreBoost from this improvement
              if (
                imp.matchScoreBoost &&
                typeof imp.matchScoreBoost === "number"
              ) {
                matchScoreBoostToApply = imp.matchScoreBoost;
              }
              return { ...imp, isApplied: true };
            }
            return imp;
          });

          const updateData: {
            improvements: typeof updatedImprovements;
            matchScore?: number;
          } = {
            improvements: updatedImprovements,
          };

          if (matchScoreBoostToApply > 0) {
            // Only touch matchScore when the applied improvement carries a boost.
            updateData.matchScore = Math.min(
              100,
              (application.matchScore || 0) + matchScoreBoostToApply,
            );
          }

          await prisma.jobApplication.update({
            where: { id: input.applicationId },
            data: updateData,
          });
        }
      }

      return { success: true, changed: true };
    }),
});
