import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  normalizeResumeParsedContent,
  updateResumeParsedContent,
} from "@/lib/resume-content";
import { createAppError } from "@/lib/app-error";
import { deleteUploadThingFilesByUrl } from "@/lib/uploadthing-files";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import type {
  AnalysisImprovement,
  JobMatchImprovement,
  QuickWin,
  StructuredResumeData,
} from "@/lib/schemas";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import z from "zod";

/**
 * Per-user cap on AI analysis triggers. Each trigger enqueues an OpenAI-backed
 * job, so this stops a client from looping the mutation and draining the API
 * budget / flooding the Inngest queue.
 */
const AI_TRIGGER_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

/**
 * Upper bound for a resume's display name. Matches the `create` input cap so a
 * name cannot be renamed into something the upload path would have rejected.
 */
const RESUME_NAME_MAX_LENGTH = 120;

/**
 * A stored resume-analysis improvement plus the applied flag that
 * `applyImprovement` writes back onto it. The flag is not part of the model
 * output contract, so it only ever exists on rows the user has acted on.
 */
export type AppliedAnalysisImprovement = AnalysisImprovement & {
  isApplied?: boolean;
};

/**
 * Compares two suggestion texts, treating null, undefined and "" as the same
 * empty value. The model may omit `currentText` entirely, and the client turns
 * that into `undefined` on the way back, so a strict `===` would never match.
 */
const isSameSuggestionText = (
  a: string | null | undefined,
  b: string | null | undefined,
) => (a ?? "").trim() === (b ?? "").trim();

/**
 * Rejects an AI-trigger call that exceeds the per-user rate limit with a
 * retryable TOO_MANY_REQUESTS error (HTTP 429).
 */
const enforceAiTriggerLimit = (userId: string, action: string) => {
  const result = rateLimit(`${action}:${userId}`, AI_TRIGGER_RATE_LIMIT);
  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many analysis requests. Please wait ${Math.ceil(
        result.retryAfterMs / 1000,
      )}s and try again.`,
    });
  }
};

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
          search: z.string().optional(),
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 6;
      const requestedPage = input?.page ?? 1;
      const search = input?.search;
      const status = input?.status;

      const totalCount = await prisma.resume.count({
        where: {
          userId: ctx.auth.user.id,
          ...(search && {
            resumeName: { contains: search, mode: "insensitive" },
          }),
          ...(status && { status }),
        },
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
        where: {
          userId: ctx.auth.user.id,
          ...(search && {
            resumeName: { contains: search, mode: "insensitive" },
          }),
          ...(status && { status }),
        },
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
      enforceAiTriggerLimit(ctx.auth.user.id, "triggerAnalysis");

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
          quickWins: analysis.quickWins as QuickWin[],
          improvements: analysis.improvements as AnalysisImprovement[],
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
        improvements: analysis.improvements as AppliedAnalysisImprovement[],
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
      enforceAiTriggerLimit(ctx.auth.user.id, "triggerJobMatch");

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

      // 1. Read the structured resume JSON as its typed shape.
      const data = resume.structuredData
        ? (resume.structuredData as StructuredResumeData)
        : null;

      // 2. Precisely edit the fragment
      if (data && input.targetSection === "summary" && data.personalInfo) {
        const currentSummary = data.personalInfo.summary?.trim() ?? "";

        if (currentSummary !== newText) {
          data.personalInfo.summary = input.newText;
          changed = true;
        }
      }

      if (
        data &&
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
        data &&
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
        data &&
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

      if (data && input.targetSection === "skills") {
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

      if (data && !changed) {
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

      const updatePayload = data
        ? {
            structuredData: data as unknown as Prisma.InputJsonValue,
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
          const improvements = application.improvements as Array<
            JobMatchImprovement & { isApplied?: boolean }
          >;
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
            improvements: Prisma.InputJsonValue;
            matchScore?: number;
          } = {
            improvements: updatedImprovements as unknown as Prisma.InputJsonValue,
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
      } else {
        // 5. No applicationId means the call came from the AI Coach, where the
        // suggestions live on the resume's own analysis instead. Mark it there
        // so the applied state survives a reload the same way it does for a
        // job match.
        const analysis = await prisma.resumeAnalysis.findFirst({
          where: {
            resumeId: input.resumeId,
            resume: { userId: ctx.auth.user.id },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, improvements: true },
        });

        if (analysis && Array.isArray(analysis.improvements)) {
          const improvements =
            analysis.improvements as unknown as AppliedAnalysisImprovement[];

          let matched = false;
          const updatedImprovements = improvements.map((imp) => {
            if (
              !matched &&
              imp.targetSection === input.targetSection &&
              imp.targetId === input.targetId &&
              isSameSuggestionText(imp.currentText, input.previousText) &&
              isSameSuggestionText(imp.suggestedText, input.newText)
            ) {
              matched = true;
              return { ...imp, isApplied: true };
            }
            return imp;
          });

          if (matched) {
            await prisma.resumeAnalysis.update({
              where: { id: analysis.id },
              data: {
                improvements:
                  updatedImprovements as unknown as Prisma.InputJsonValue,
              },
            });
          }
        }
      }

      return { success: true, changed: true };
    }),
  /**
   * Renames a resume's user-facing display name.
   *
   * Only `resumeName` changes. `fileName`, `resumeLink` and `resumePreviewLink`
   * are the handles the storage layer deletes blobs by, so renaming must never
   * touch them or the file reference breaks.
   */
  rename: protectedProcedure
    .input(
      z.object({
        resumeId: z.string(),
        // `trim` runs before the length check, so a whitespace-only string
        // collapses to "" and is rejected by `min(1)`.
        resumeName: z
          .string()
          .trim()
          .min(1, "Resume name cannot be empty")
          .max(RESUME_NAME_MAX_LENGTH, "Resume name is too long"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // updateMany scopes by the non-unique userId and returns a count instead
      // of throwing, so another user's id is indistinguishable from a missing
      // row — both surface as NOT_FOUND rather than leaking existence.
      const result = await prisma.resume.updateMany({
        where: {
          id: input.resumeId,
          userId: ctx.auth.user.id,
        },
        data: { resumeName: input.resumeName },
      });

      if (result.count === 0) {
        throw createAppError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }

      return { success: true, resumeName: input.resumeName };
    }),

  deleteResume: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Read the file URLs before the row disappears — afterwards there is no
      // way left to find the blobs this resume owns in storage.
      const resume = await prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.auth.user.id },
        select: { resumeLink: true, resumePreviewLink: true },
      });

      // deleteMany lets us scope by the non-unique userId safely and returns a
      // count instead of throwing when nothing matches.
      const result = await prisma.resume.deleteMany({
        where: {
          id: input.resumeId,
          userId: ctx.auth.user.id,
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resume not found",
        });
      }

      // The row is gone, so the delete already succeeded from the user's point
      // of view. Storage cleanup is best-effort and never fails the mutation.
      await deleteUploadThingFilesByUrl(
        [resume?.resumeLink, resume?.resumePreviewLink],
        "Failed to delete resume files from storage",
      );

      return { success: true };
    }),
});
