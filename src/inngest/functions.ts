// src/inngest/functions.ts
import { getJobMatchPrompt, getPrompt } from "@/lib/utils";
import { inngest } from "./client";
import OpenAI from "openai";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "@/lib/schemas";
import prisma from "@/lib/db";
import Pusher from "pusher";

const openai = new OpenAI();

export const analyzeResume = inngest.createFunction(
  { id: "analyze-resume", triggers: { event: "app/resume.analyzed" } },
  // The function receives the parsed resume content and the target role, then generates a prompt for the OpenAI API to analyze the resume against the target role. The result is returned after a brief pause.
  async ({ event, step }) => {
    const resumeText = getPrompt(
      event.data.parsedContent,
      event.data.postedRole,
    );
    const result = await step.run("handle-task", async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.PUSHER_APP_KEY!,
        secret: process.env.PUSHER_APP_SECRET!,
        cluster: process.env.PUSHER_APP_CLUSTER!,
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

export const analyzeJobMatched = inngest.createFunction(
  {
    id: "analyze-job-matched",
    triggers: { event: "app/job-matched.analyzed" },
  },
  // The function receives the parsed resume content and the target role, then generates a prompt for the OpenAI API to analyze the resume against the target role. The result is returned after a brief pause.
  async ({ event, step }) => {
    const comparedText = getJobMatchPrompt(
      event.data.parsedContent,
      event.data.jobDescription,
    );
    const result = await step.run("handle-task", async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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

    // Save the analysis results to the database, linking it to the correct resume. We use upsert to create a new analysis if it doesn't exist or update the existing one if it does.
    await step.run("save-to-db", async () => {
      await prisma.jobApplication.update({
        where: { id: event.data.applicationId },
        data: {
          matchScore: validatedData.matchScore,
          matchingSkills: validatedData.matchingSkills,
          missingSkills: validatedData.missingSkills,
          tailoringTips: validatedData.tailoringTips,
          coverLetterText: validatedData.coverLetterText,
          status: "ANALYZED",
        },
      });
    });

    // After saving the results, we trigger a Pusher event to notify the client that the analysis is complete. The client can listen for this event and update the UI accordingly.
    await step.run("notify-client", async () => {
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.PUSHER_APP_KEY!,
        secret: process.env.PUSHER_APP_SECRET!,
        cluster: process.env.PUSHER_APP_CLUSTER!,
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
      message: `Job Match Analysis for job ${event.data.jobDescription} complete`,
      data: validatedData,
    };
  },
);
