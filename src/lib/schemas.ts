import { z } from "zod";

const requirementMatchItemSchema = z.object({
  requirement: z.string(),
  matched: z.boolean(),
  importance: z.enum(["Critical", "High", "Medium", "Low"]),
  evidence: z.string().nullable().optional().default(null),
});

const skillGapItemSchema = z.object({
  skill: z.string(),
  importance: z.enum(["Critical", "High", "Medium", "Low"]),
  matched: z.boolean(),
});

const requirementsMatchSchema = z
  .object({
    required: z.array(requirementMatchItemSchema).default([]),
    preferred: z.array(requirementMatchItemSchema).default([]),
  })
  .default({ required: [], preferred: [] });

const skillsGapSchema = z
  .object({
    technical: z.array(skillGapItemSchema).default([]),
    soft: z.array(skillGapItemSchema).default([]),
    missingCriticalSkills: z.array(z.string()).default([]),
  })
  .default({ technical: [], soft: [], missingCriticalSkills: [] });

const keywordsGapSchema = z
  .object({
    found: z.array(z.string()).default([]),
    missing: z.array(z.string()).default([]),
  })
  .default({ found: [], missing: [] });

const analysisSummarySchema = z
  .object({
    requiredMatched: z.number().int().min(0).default(0),
    requiredTotal: z.number().int().min(0).default(0),
    preferredMatched: z.number().int().min(0).default(0),
    preferredTotal: z.number().int().min(0).default(0),
    estimatedScoreWithAllImprovements: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(0),
  })
  .default({
    requiredMatched: 0,
    requiredTotal: 0,
    preferredMatched: 0,
    preferredTotal: 0,
    estimatedScoreWithAllImprovements: 0,
  });

const jobMatchImprovementSchema = z.object({
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  title: z.string(),
  description: z.string(),
  matchScoreBoost: z.number().int().min(0).max(100).default(0),
  suggestions: z.array(z.string()).default([]),
  targetSection: z.enum([
    "summary",
    "experience",
    "education",
    "projects",
    "skills",
  ]),
  targetId: z.string().optional(),
  beforeText: z
    .string()
    .nullish()
    .transform((value) =>
      safeString(value, "Current resume text is missing for this requirement."),
    ),
  afterText: z
    .string()
    .nullish()
    .transform((value) =>
      safeString(
        value,
        "Add a measurable bullet aligned with this requirement using the XYZ formula.",
      ),
    ),
});

const safeString = (value: string | null | undefined, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

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
      targetSection: z.enum([
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
      ]),
      targetId: z.string().optional(),
    }),
  ),
  structuredData: z
    .object({
      personalInfo: z.object({
        name: z.string().optional().default(""),
        email: z.string().optional().default(""),
        phone: z.string().optional().default(""),
        location: z.string().optional().default(""),
        links: z.array(z.string()).optional().default([]),
        summary: z.string().optional().default(""),
      }),
      experience: z
        .array(
          z.object({
            id: z.string(),
            company: z.string(),
            role: z.string(),
            date: z.string(),
            bullets: z.array(
              z.object({
                id: z.string(),
                text: z.string(),
              }),
            ),
          }),
        )
        .default([]),
      education: z
        .array(
          z.object({
            id: z.string(),
            institution: z.string(),
            degree: z.string(),
            date: z.string(),
            bullets: z
              .array(
                z.object({
                  id: z.string(),
                  text: z.string(),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
      projects: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            date: z.string(),
            bullets: z
              .array(
                z.object({
                  id: z.string(),
                  text: z.string(),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
      skills: z.array(z.string()).default([]),
    })
    .optional(),
});

export const jobMatchAnalysisSchema = z.object({
  companyName: z.string().nullable().optional().default(null),
  experience: z.string().nullable().optional().default(null),
  salaryRange: z.string().nullable().optional().default(null),
  jobTitle: z.string().nullable().optional().default(null),
  url: z.string().nullable().optional().default(null),
  targetLanguage: z.string().min(1).default("English"),
  matchScore: z.number().int().min(0).max(100),
  matchingSkills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["High", "Medium", "Low"]),
    }),
  ),
  improvements: z.array(jobMatchImprovementSchema).default([]),
  missingSkills: z.array(
    z.object({
      skill: z.string(),
      impact: z.enum(["High", "Medium", "Low"]),
    }),
  ),
  // tailoringTips: z.array(
  //   z.object({
  //     jobRequirement: z
  //       .string()
  //       .nullish()
  //       .transform((value) =>
  //         safeString(value, "Requirement from job description"),
  //       ),
  //     currentResumeText: z
  //       .string()
  //       .nullish()
  //       .transform((value) =>
  //         safeString(
  //           value,
  //           "No direct match found in the resume. Add a new bullet aligned with this requirement.",
  //         ),
  //       ),
  //     suggestedRewrite: z
  //       .string()
  //       .nullish()
  //       .transform((value) =>
  //         safeString(
  //           value,
  //           "Add a new, metrics-driven bullet aligned with this requirement using the XYZ formula.",
  //         ),
  //       ),
  //   }),
  // ),
  requirementsMatch: requirementsMatchSchema.optional().default({
    required: [],
    preferred: [],
  }),
  skillsGap: skillsGapSchema.optional().default({
    technical: [],
    soft: [],
    missingCriticalSkills: [],
  }),
  keywordsGap: keywordsGapSchema.optional().default({
    found: [],
    missing: [],
  }),
  summary: analysisSummarySchema.optional().default({
    requiredMatched: 0,
    requiredTotal: 0,
    preferredMatched: 0,
    preferredTotal: 0,
    estimatedScoreWithAllImprovements: 0,
  }),
  coverLetterText: z.string(),
});
