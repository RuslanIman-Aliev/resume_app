import { z } from "zod";

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  categoryScores: z.object({
    contentQuality: z.number().int().min(0).max(100),
    atsOptimization: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
    skillsMatch: z.number().int().min(0).max(100),
  }),
  keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  quickWins: z.array(
    z.object({
      title: z.string(),
      impact: z.enum(["High", "Medium", "Low"]),
      timeEstimate: z.string(),
    }),
  ),
  improvements: z.array(
    z.object({
      category: z.enum([
        "Content",
        "Skills",
        "Keywords",
        "Format",
        "Experience",
      ]),
      impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]),
      title: z.string(),
      description: z.string(),
      currentText: z.string().nullable(),
      suggestedText: z.string().nullable(),
      tips: z.array(z.string()),
    }),
  ),
});

export const jobMatchAnalysisSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchingSkills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["High", "Medium", "Low"]),
    })
  ),
  missingSkills: z.array(
    z.object({
      skill: z.string(),
      impact: z.enum(["High", "Medium", "Low"]),
    })
  ),
  tailoringTips: z.array(
    z.object({
      jobRequirement: z.string(),
      currentResumeText: z.string(),
      suggestedRewrite: z.string(),
    })
  ),
  coverLetterText: z.string(),
});

export type JobMatchAnalysis = z.infer<typeof jobMatchAnalysisSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
