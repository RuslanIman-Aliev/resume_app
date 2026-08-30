import { getJobMatchPrompt, getPrompt } from "@/lib/prompts";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import OpenAI from "openai";
import { normalizeMatchScoreBoosts } from "@/lib/match-score";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "@/lib/schemas";
import prisma from "@/lib/db";
import {
  analyzedEventName,
  failedEventName,
  jobMatchChannel,
  resumeAnalysisChannel,
} from "@/lib/pusher-channels";
import { createPusherServer } from "@/lib/pusher-server";
import * as Sentry from "@sentry/nextjs";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/logger";

const openai = new OpenAI();
const client = Sentry.instrumentOpenAiClient(openai, {
  // The prompt is the user's resume and the job description they pasted, and
  // the response repeats large parts of both back. Recording either would ship
  // names, phone numbers and full employment history to Sentry, which is what
  // "never dump raw objects/uploads" in CLAUDE.md exists to prevent.
  recordInputs: false,
  recordOutputs: false,
});

/**
 * Channels and event names live in `@/lib/pusher-channels`, imported above and
 * also by the client hooks and by the endpoint that authorizes subscriptions.
 * Each analysis publishes to its own private channel, and ends in one of two
 * events, so a client that subscribed for a result is also told when there
 * will not be one.
 */

/**
 * Parses and validates a model response, refusing to retry on bad output.
 *
 * The raw response is memoized by the `handle-task` step, so a retry re-parses
 * the identical string and fails identically - three more times, several
 * seconds apart, before the run is finally marked failed. `NonRetriableError`
 * ends it on the first attempt so the UI reaches its error state promptly.
 *
 * @param raw - The model's `message.content`, possibly null.
 * @param schema - Zod schema the response has to satisfy.
 * @returns The validated payload.
 * @throws NonRetriableError when the response is not valid JSON or off-schema.
 */
const parseModelOutput = <T>(
  raw: string | null | undefined,
  schema: { parse: (value: unknown) => T },
): T => {
  try {
    return schema.parse(JSON.parse(raw || "{}"));
  } catch (error) {
    // Logged rather than attached to the thrown error: the Zod issue list
    // quotes the offending values, which here are pieces of the resume.
    logError("Model returned an unusable analysis payload", error);
    throw new NonRetriableError(
      "The AI response did not match the expected analysis format.",
    );
  }
};
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
    /**
     * Runs once the function has exhausted its retries, and is the only thing
     * that gives a dead run a visible ending. Before it existed the resume
     * stayed on DRAFT, no Pusher event was sent, and the page polled the same
     * unchanged row every four seconds with no way out of "Analyzing...".
     */
    onFailure: async ({ event, step }) => {
      const { resumeId } = event.data.event.data;

      await step.run("mark-analysis-failed", async () => {
        // Scoped to rows that are not already ANALYZED: a failed re-analysis
        // must not retract results the user can still read from a previous
        // successful run. The Pusher event below tells them either way.
        await prisma.resume.updateMany({
          where: { id: resumeId, status: { not: "ANALYZED" } },
          data: { status: "FAILED" },
        });
      });

      await step.run("notify-client-failed", async () => {
        await createPusherServer().trigger(
          resumeAnalysisChannel(resumeId),
          failedEventName(resumeId),
          { message: "Analysis failed" },
        );
      });
    },
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

    // Inside a step: parsing used to happen in the function body, so an
    // off-schema response threw before `save-to-db` and `notify-client` ran and
    // left the row in the same state a run still in progress has.
    const validatedData = await step.run("validate-model-output", () =>
      parseModelOutput(result, resumeAnalysisSchema),
    );

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
      await createPusherServer().trigger(
        resumeAnalysisChannel(event.data.resumeId),
        analyzedEventName(event.data.resumeId),
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
    /**
     * Terminal state for a dead job-match run. Without it the application row
     * sat on TO_APPLY forever, which `getJobMatchResult` reports as "still
     * analysing", so the analyzer page span its loading screen indefinitely.
     */
    onFailure: async ({ event, step }) => {
      const { applicationId } = event.data.event.data;

      await step.run("mark-analysis-failed", async () => {
        await prisma.jobApplication.updateMany({
          where: { id: applicationId, status: { not: "ANALYZED" } },
          data: { status: "FAILED" },
        });
      });

      await step.run("notify-client-failed", async () => {
        await createPusherServer().trigger(
          jobMatchChannel(applicationId),
          failedEventName(applicationId),
          { message: "Job match analysis failed" },
        );
      });
    },
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

    const validatedData = await step.run("validate-model-output", () =>
      parseModelOutput(result, jobMatchAnalysisSchema),
    );

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

        // Keyed on the application, so a retried step or a re-run of the same
        // analysis updates the card it already created. As a plain `create`
        // this step was not idempotent: Inngest retries a step whose commit
        // failed, and every retry added another identical card to the board.
        prisma.trackerPosition.upsert({
          where: { jobApplicationId: event.data.applicationId },
          create: {
            userId: existingApp.userId,
            jobApplicationId: event.data.applicationId,
            company: validatedData.companyName || "Unknown Company",
            position: validatedData.jobTitle || "Unknown Position",
            salary: validatedData.salaryRange,
            url: validatedData.url,
            matchScore: validatedData.matchScore,
            status: "saved",
            location: "Location not specified",
          },
          // Only what the analysis is the source of truth for. `status`,
          // `notes` and the contact fields are the user's - a re-analysis must
          // not drag a card that reached "interview" back to "saved".
          update: {
            company: validatedData.companyName || "Unknown Company",
            position: validatedData.jobTitle || "Unknown Position",
            salary: validatedData.salaryRange,
            url: validatedData.url,
            matchScore: validatedData.matchScore,
          },
        }),
      ]);
    });
    // After saving the results, we trigger a Pusher event to notify the client that the analysis is complete. The client can listen for this event and update the UI accordingly.
    await step.run("notify-client", async () => {
      await createPusherServer().trigger(
        jobMatchChannel(event.data.applicationId),
        analyzedEventName(event.data.applicationId),
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
