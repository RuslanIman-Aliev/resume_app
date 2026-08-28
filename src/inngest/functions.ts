import { getJobMatchPrompt, getPrompt } from "@/lib/prompts";
import { inngest } from "./client";
import OpenAI from "openai";
import { normalizeMatchScoreBoosts } from "@/lib/match-score";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "@/lib/schemas";
import prisma from "@/lib/db";
import Pusher from "pusher";
import * as Sentry from "@sentry/nextjs";
import { serverEnv } from "@/lib/env.server";

const openai = new OpenAI();
const client = Sentry.instrumentOpenAiClient(openai, {
  recordInputs: true,
  recordOutputs: true,
});
/**
 * Per-user ceiling on AI analysis runs, applied to every function below.
 *
 * Enforced by Inngest rather than by the in-process limiter in `@/lib/rate-limit`
 * because that one keeps its counters in a single instance's memory. Vercel runs
 * these routes as serverless functions: it spins up as many instances as the
 * load needs and recycles them, so an in-memory ceiling is silently multiplied
 * by the instance count and reset by every cold start. Inngest counts centrally,
 * so the limit holds however the platform scales.
 *
 * `throttle` delays excess runs rather than discarding them. `rateLimit` would
 * drop the event outright, and since the client waits for a Pusher message that
 * the dropped run would have sent, the UI would spin forever.
 *
 * `concurrency` keyed by user stops one person from holding several analyses in
 * flight at once - the burst that costs the most in the shortest time.
 *
 * Both are keyed on `event.data.userId`, so every event that triggers these
 * functions has to carry it; without the field the key resolves to nothing and
 * the limit silently becomes global across all users.
 */
const PER_USER_ANALYSIS_LIMITS = {
  throttle: { limit: 20, period: "1h", key: "event.data.userId" },
  concurrency: { limit: 1, key: "event.data.userId" },
} as const;

/**
 * Inngest function that analyzes a resume against a target role using OpenAI.
 * Generates AI-powered insights, calculates scores, and saves results to database.
 * Notifies client via Pusher when analysis completes.
 * @event app/resume.analyzed - Triggered with resumeId, postedRole, and parsedContent
 * @returns Analysis result object with scores, keywords, strengths, and improvements
 */
export const analyzeResume = inngest.createFunction(
  {
    id: "analyze-resume",
    triggers: { event: "app/resume.analyzed" },
    ...PER_USER_ANALYSIS_LIMITS,
  },
  // The function receives the parsed resume content and the target role, then generates a prompt for the OpenAI API to analyze the resume against the target role. The result is returned after a brief pause.
  async ({ event, step }) => {
    const resumeText = getPrompt(
      event.data.parsedContent,
      event.data.postedRole,
    );
    const result = await step.run("handle-task", async () => {
      const response = await client.chat.completions.create({
        model: serverEnv.OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: resumeText,
          },
        ],
        response_format: { type: "json_object" },
      });
      return response.choices[0].message.content;
    });

    const parsedData = JSON.parse(result || "{}");

    const validatedData = resumeAnalysisSchema.parse(parsedData);

    // Save the analysis results to the database, linking it to the correct resume. We use upsert to create a new analysis if it doesn't exist or update the existing one if it does.
    await step.run("save-to-db", async () => {
      await prisma.resume.update({
        where: {
          id: event.data.resumeId,
        },
        data: {
          status: "ANALYZED",
          structuredData: validatedData.structuredData,
          analysis: {
            create: {
              overallScore: validatedData.overallScore,
              contentQuality: validatedData.categoryScores.contentQuality,
              atsOptimization: validatedData.categoryScores.atsOptimization,
              experience: validatedData.categoryScores.experience,
              skillsMatch: validatedData.categoryScores.skillsMatch,
              keywords: validatedData.keywords,
              strengths: validatedData.strengths,
              quickWins: validatedData.quickWins,
              improvements: validatedData.improvements,
            },
          },
        },
      });
    });
    // After saving the results, we trigger a Pusher event to notify the client that the analysis is complete. The client can listen for this event and update the UI accordingly.
    await step.run("notify-client", async () => {
      const pusher = new Pusher({
        appId: serverEnv.PUSHER_APP_ID,
        key: serverEnv.PUSHER_APP_KEY,
        secret: serverEnv.PUSHER_APP_SECRET,
        cluster: serverEnv.PUSHER_APP_CLUSTER,
        useTLS: true,
      });
      await pusher.trigger(
        "resume-updates",
        `analyzed-${event.data.resumeId}`,
        {
          message: "Analysis complete",
        },
      );
    });
    return {
      message: `Resume analysis for role ${event.data.postedRole} complete`,
      data: validatedData,
    };
  },
);

/**
 * Inngest function that analyzes job application match against a resume using OpenAI.
 * Compares resume skills and experience to job requirements and generates tailored insights.
 * Saves detailed match analysis to database and notifies client via Pusher.
 * @event app/job-matched.analyzed - Triggered with applicationId, jobDescription, and parsedContent
 * @returns Job match analysis with scores, skill gaps, requirements matching, and cover letter
 */
export const analyzeJobMatched = inngest.createFunction(
  {
    id: "analyze-job-matched",
    triggers: { event: "app/job-matched.analyzed" },
    ...PER_USER_ANALYSIS_LIMITS,
  },
  // The function receives the parsed resume content and the target role, then generates a prompt for the OpenAI API to analyze the resume against the target role. The result is returned after a brief pause.
  async ({ event, step }) => {
    const comparedText = getJobMatchPrompt(
      event.data.parsedContent,
      event.data.jobDescription,
    );
    const result = await step.run("handle-task", async () => {
      const response = await client.chat.completions.create({
        model: serverEnv.OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: comparedText,
          },
        ],
        response_format: { type: "json_object" },
      });
      return response.choices[0].message.content;
    });

    const parsedData = JSON.parse(result || "{}");
    const validatedData = jobMatchAnalysisSchema.parse(parsedData);

    // The prompt asks for a per-improvement boost and the model answers with a
    // double-digit number on every card, so the totals are re-derived here
    // before anything is stored or shown.
    const { improvements, estimatedScoreWithAllImprovements } =
      normalizeMatchScoreBoosts({
        matchScore: validatedData.matchScore,
        improvements: validatedData.improvements,
        estimatedScoreWithAllImprovements:
          validatedData.summary.estimatedScoreWithAllImprovements,
      });
    const summary = {
      ...validatedData.summary,
      estimatedScoreWithAllImprovements,
    };

    // Save the analysis results to the database, linking it to the correct resume. We use upsert to create a new analysis if it doesn't exist or update the existing one if it does.
    await step.run("save-to-db", async () => {
      const existingApp = await prisma.jobApplication.findUnique({
        where: { id: event.data.applicationId },
        select: { userId: true },
      });

      if (!existingApp) {
        throw new Error(`Application ${event.data.applicationId} not found`);
      }

      await prisma.$transaction([
        prisma.jobApplication.update({
          where: { id: event.data.applicationId },
          data: {
            companyName: validatedData.companyName,
            jobTitle: validatedData.jobTitle,
            url: validatedData.url,
            salaryRange: validatedData.salaryRange,
            experience: validatedData.experience,
            targetLanguage: validatedData.targetLanguage,
            matchScore: validatedData.matchScore,
            matchingSkills: validatedData.matchingSkills,
            improvements,
            missingSkills: validatedData.missingSkills,
            requirementsMatch: validatedData.requirementsMatch,
            skillsGap: validatedData.skillsGap,
            keywordsGap: validatedData.keywordsGap,
            summary,
            coverLetterText: validatedData.coverLetterText,
            status: "ANALYZED",
          },
        }),

        prisma.trackerPosition.create({
          data: {
            userId: existingApp.userId,
            company: validatedData.companyName || "Unknown Company",
            position: validatedData.jobTitle || "Unknown Position",
            salary: validatedData.salaryRange,
            url: validatedData.url,
            matchScore: validatedData.matchScore,
            status: "saved",
            location: "Location not specified",
          },
        }),
      ]);
    });
    // After saving the results, we trigger a Pusher event to notify the client that the analysis is complete. The client can listen for this event and update the UI accordingly.
    await step.run("notify-client", async () => {
      const pusher = new Pusher({
        appId: serverEnv.PUSHER_APP_ID,
        key: serverEnv.PUSHER_APP_KEY,
        secret: serverEnv.PUSHER_APP_SECRET,
        cluster: serverEnv.PUSHER_APP_CLUSTER,
        useTLS: true,
      });
      await pusher.trigger(
        "job-match",
        `analyzed-${event.data.applicationId}`,
        {
          message: "Job Match Analysis complete",
        },
      );
    });
    return {
      message: `Job Match Analysis complete for application ${event.data.applicationId}`,
      data: validatedData,
    };
  },
);
