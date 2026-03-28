import { z } from "zod";

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: z.object({
    contentQuality: z.number().min(0).max(100),
    atsOptimization: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    skillsMatch: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  quickWins: z.array(
    z.object({
      title: z.string(),
      impact: z.enum(["High", "Medium", "Low"]),
      timeEstimate: z.string(),
    })
  ),
  improvements: z.array(
    z.object({
      category: z.enum(["Content", "Skills", "Keywords", "Format", "Experience"]),
      impact: z.enum(["High Impact", "Medium Impact", "Low Impact"]),
      title: z.string(),
      description: z.string(),
      currentText: z.string().nullable(),
      suggestedText: z.string().nullable(),
      tips: z.array(z.string()),
    })
  ),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;