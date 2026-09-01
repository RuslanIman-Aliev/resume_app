import { z } from "zod";
import { sanitizeHttpUrl } from "./safe-url";

/**
 * The job post URL as the model returns it, narrowed to an absolute http(s)
 * link.
 *
 * The model reads the job description, which is untrusted text, so this field
 * is as attacker-influenced as the description itself. Anything that is not a
 * plain web link - `javascript:` above all - is dropped to null here rather
 * than stored and later rendered as an `href`.
 */
const modelJobUrlSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => sanitizeHttpUrl(value));

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

const quickWinSchema = z.object({
  title: z.string(),
  impact: z.enum(["High", "Medium", "Low"]),
  timeEstimate: z.string(),
});

const analysisImprovementSchema = z.object({
  // "Projects" is here because the model puts it here. The prompt lists five
  // categories and, separately, five `targetSection` values that include
  // "projects" - so an improvement aimed at a project bullet comes back as
  // category "Projects", which this enum used to reject. That rejection is a
  // NonRetriableError, so the whole analysis died: six of eight measured runs
  // on a resume with a projects section, which is nearly every developer's.
  category: z.enum([
    "Content",
    "Skills",
    "Keywords",
    "Format",
    "Experience",
    "Projects",
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
  // The question the model asks instead of inventing a figure. Null whenever
  // the suggestion needs no number. See the "ABSOLUTE RULE ON NUMBERS" block
  // in `getPrompt`.
  metricPrompt: z.string().nullable().optional().default(null),
});

/**
 * Structured, section-by-section representation of a resume produced by the
 * analyzer. Persisted as a JSON column and edited by `resume.applyImprovement`.
 */
export const structuredResumeDataSchema = z.object({
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
});

/**
 * Validation schema for resume analysis results from OpenAI.
 * Includes scores, category breakdowns, keywords, strengths, improvements, and structured resume data.
 */
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
  quickWins: z.array(quickWinSchema),
  improvements: z.array(analysisImprovementSchema),
  structuredData: structuredResumeDataSchema.optional(),
});

/** A single quick-win suggestion from a resume analysis. */
export type QuickWin = z.infer<typeof quickWinSchema>;
/** A single detailed improvement suggestion from a resume analysis. */
export type AnalysisImprovement = z.infer<typeof analysisImprovementSchema>;
/** Structured, section-based resume data edited by applyImprovement. */
export type StructuredResumeData = z.infer<typeof structuredResumeDataSchema>;

/**
 * Validation schema for job match analysis comparing resume against job description.
 * Includes match score, skill gaps, requirements matching, improvements, and generated cover letter.
 */
export const jobMatchAnalysisSchema = z.object({
  companyName: z.string().nullable().optional().default(null),
  experience: z.string().nullable().optional().default(null),
  salaryRange: z.string().nullable().optional().default(null),
  jobTitle: z.string().nullable().optional().default(null),
  url: modelJobUrlSchema,
  targetLanguage: z.string().min(1).default("English"),
  matchScore: z.number().int().min(0).max(100),
  // `evidence` is optional here on purpose, even though the prompt demands it.
  // A required field is a failure mode: the analysis prompt's `category` enum
  // taught us that one value the model omits or renames kills the entire run
  // via NonRetriableError. So the schema stays permissive and
  // `keepEvidencedMatchingSkills` drops the unevidenced entries instead - a
  // shorter, honest list rather than no analysis at all.
  matchingSkills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["High", "Medium", "Low"]),
      evidence: z.string().nullable().optional().default(null),
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
  // Split out of the letter body so an export can lay them out to DIN 5008
  // later. Both stay optional: the body is what the product has always shown,
  // and a model that omits either must not take the whole analysis down with
  // it - the lesson from the `category` enum.
  coverLetterSubject: z.string().nullable().optional().default(null),
  coverLetterAvailability: z.string().nullable().optional().default(null),
  coverLetterText: z.string(),
});

/** A single improvement suggestion from a job-match analysis. */
export type JobMatchImprovement = z.infer<typeof jobMatchImprovementSchema>;
