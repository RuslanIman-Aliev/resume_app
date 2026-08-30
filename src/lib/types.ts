import z from "zod";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "./schemas";
import { isSafeHttpUrl } from "./safe-url";

export const signUpFormSchema = z
  .object({
    // The message says what the rule actually checks. It used to promise three
    // characters while accepting one, and the rule is the part worth keeping:
    // single-character names are real, so the field only needs to be non-empty.
    name: z.string().trim().min(1, "Please enter your name."),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(100, "Password must be at most 100 characters."),
    confirmPassword: z
      .string()
      .min(8, "Confirm Password must be at least 8 characters.")
      .max(100, "Confirm Password must be at most 100 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpFormSchema>;

export const signInFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export type SignInFormData = z.infer<typeof signInFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

export const resetPasswordFormSchema = z
  .object({
    // Matches the bounds Better Auth enforces server-side, so a password it
    // would reject is caught before the request.
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(100, "Password must be at most 100 characters."),
    confirmPassword: z
      .string()
      .min(8, "Confirm Password must be at least 8 characters.")
      .max(100, "Confirm Password must be at most 100 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

/**
 * Represents a single piece of actionable advice to improve a resume.
 */
export interface ImprovementTip {
  /** Short title summarizing the improvement. */
  title: string;
  /** Importance level: e.g., 'high', 'medium', 'low'. */
  priority: string;
  /** Suggested improved text. */
  afterText: string;
  /** Original text to be improved. */
  beforeText: string;
  /** Detailed explanation of why the change is recommended. */
  description: string;
  /** Additional variations or tips for applying the change. */
  suggestions: string[];
  /** Estimated impact on the overall match score. */
  matchScoreBoost: number;
  /** Broad area of the tip (e.g., 'formatting', 'content', 'keywords'). */
  category?: string;
  /** The specific resume section this tip targets. */
  targetSection: "summary" | "experience" | "education" | "projects" | "skills";
  /** The unique identifier of the exact item inside the target section (if applicable). */
  targetId?: string;
  /** Tracks whether the user has applied this tip. */
  isApplied?: boolean;
}

/**
 * Common data structure for a work experience entry in the resume.
 */
export interface ResumeBlockInfo {
  /** Unique identifier for the experience block. */
  id: string;
  /** Name of the organization. */
  company: string;
  /** Job title held. */
  role: string;
  /** Duration or timeframe of the role. */
  date: string;
  /** List of achievements and responsibilities. */
  bullets: {
    /** Unique identifier for the bullet point. */
    id: string;
    /** The actual text of the accomplishment. */
    text: string;
  }[];
}

/**
 * Data structure for an educational qualification in the resume.
 */
export interface EducationBlockInfo {
  /** Unique identifier for the education block. */
  id: string;
  /** Name of the academic institution. */
  institution: string;
  /** Level of degree or certification acquired. */
  degree: string;
  /** Date of graduation or timeframe. */
  date: string;
  /** Relevant coursework, honors, or extracurriculars. */
  bullets: {
    id: string;
    text: string;
  }[];
}

/**
 * Data structure for a notable project in the resume.
 */
export interface ProjectBlockInfo {
  /** Unique identifier for the project block. */
  id: string;
  /** Title of the project. */
  name: string;
  /** Date or timeframe the project was completed. */
  date: string;
  /** Details covering technologies used and impact. */
  bullets: {
    id: string;
    text: string;
  }[];
}

/**
 * The complete, structured representation of a user's resume text.
 */
export interface StructuredResumeData {
  /** Basic contact and profile details. */
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    links?: string[];
    summary: string;
  };
  /** Work history comprising various roles. */
  experience: ResumeBlockInfo[];
  /** Academic background. */
  education: EducationBlockInfo[];
  /** Highlighted portfolio items or side projects. */
  projects?: ProjectBlockInfo[];
  /** Raw list of technical and soft skills. */
  skills: string[];
}

/**
 * Summary data for a job application match analysis result.
 */
interface ApplicationSummary {
  /** Estimated match score if all improvements are applied. */
  estimatedScoreWithAllImprovements: number;
}

/**
 * Structured data for a job application with analysis results.
 * Represents a single application including improvements and match summary.
 */
export interface ApplicationData {
  /** Unique identifier for the application. */
  id: string;
  /** Match score between 0-100 for this application. */
  matchScore: number;
  /** List of improvement recommendations. */
  improvements: ImprovementTip[] | null;
  /** Summary statistics for the match analysis. */
  summary: ApplicationSummary | null;
}

/**
 * Job application card display type for tracker/kanban components.
 * Simplified data structure for UI presentation of job applications.
 */
export type JobApplicationCard = {
  /** Unique identifier for the job application. */
  id: string;
  
  /** Company name from the job posting. */
  company: string; // FIXED: Removed '?' and '| null'
  
  /** Job title/position from the job posting. */
  position: string; // FIXED: Removed '?' and '| null'
  
  /** Job location (e.g., city, state, remote). */
  location: string | null;
  
  /** Salary range for the position. */
  salary: string | null;
  
  /** Current status of the application. */
  status: string;
  
  /** Date when the application was submitted. */
  appliedDate?: string | null;
  
  /** Date when the record was last updated. */
  lastUpdated?: string | null;
  
  /** Job match score between 0-100, null if not yet analyzed. */
  matchScore: number | null;
  
  /** Description of the next step in the application process. */
  nextStep?: string | null;
  
  /** Date of the next step. */
  nextStepDate?: string | null;
  
  /** URL to the job posting. */
  url: string | null;

  /**
   * The analysis this card was created from, or null for one added by hand or
   * created before the link existed. Carried here because the optimistic
   * tracker updates write whole rows back into the `tracker.getAll` cache.
   */
  jobApplicationId: string | null;

  userId: string;
  
  /** Timestamp when the record was created. */
  createdAt: string; 
  
  /** Timestamp when the record was last updated. */
  updatedAt: string; 
  
  /** Associated resume metadata. */
  resume?: {
    resumeName: string;
  } | null;

  notes: string | null;
  contactName: string | null;
  contactEmail: string | null;
};
/**
 * Detailed analysis of how well a resume matches a job description.
 */
export type JobMatchAnalysis = z.infer<typeof jobMatchAnalysisSchema>;

/**
 * General analysis and scoring of a resume.
 */
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

/**
 * Level of importance for a specific skill in a job posting.
 */
export type SkillImportance = "Critical" | "High" | "Medium" | "Low";

/**
 * Represents a single skill and whether it was found in the user's resume.
 */
export type SkillGapItem = {
  /** The name of the skill. */
  skill: string;
  /** Whether the skill was found in the resume. */
  matched: boolean;
  /** How important the skill is for the job. */
  importance: SkillImportance;
};

/**
 * Comprehensive skills gap analysis categorizing soft and technical skills.
 */
export type SkillsGapData = {
  /** Soft skills gap analysis. */
  soft: SkillGapItem[];
  /** Technical skills gap analysis. */
  technical: SkillGapItem[];
  /** List of critical skills missing from the resume. */
  missingCriticalSkills: string[];
};

/**
 * A skill required by the job posting that is already present in the resume.
 */
export type MatchingSkillItem = {
  /** The name of the skill. */
  skill: string;
  /** How important the skill is for the job, when the model reported it. */
  importance: SkillImportance | null;
};

/**
 * A skill required by the job posting that is missing from the resume.
 */
export type MissingSkillItem = {
  /** The name of the skill. */
  skill: string;
  /** How much the missing skill hurts the match, when the model reported it. */
  impact: SkillImportance | null;
};

/**
 * Analysis of keywords found or missing from the resume based on the job posting.
 */
export type KeywordsGapData = {
  /** Keywords successfully found in the resume. */
  found: string[];
  /** Important keywords missing from the resume. */
  missing: string[];
};

/**
 * Level of importance for a specific job requirement.
 */
export type RequirementImportance = "Critical" | "High" | "Medium" | "Low";

/**
 * Represents a single job requirement and whether the applicant meets it.
 */
export type RequirementItem = {
  /** Whether the requirement is met by the applicant's resume. */
  matched: boolean;
  /** Quote or section from the resume proving the requirement is met. */
  evidence: string | null;
  /** How important the requirement is. */
  importance: RequirementImportance;
  /** Description of the requirement. */
  requirement: string;
};

/**
 * Comprehensive analysis of how well the applicant meets job requirements.
 */
export type RequirementsMatchData = {
  /** Analysis of required/mandatory job qualifications. */
  required: RequirementItem[];
  /** Analysis of preferred/nice-to-have job qualifications. */
  preferred: RequirementItem[];
};

/**
 * The tracker funnel, in the order a position moves through it.
 *
 * These are the literal values stored in `tracker_position.status`. Anything
 * user-visible comes from `TRACKER_STATUS_CONFIG` in `@/lib/ui-config`, which
 * is keyed by this list - keep the two in step when adding a stage.
 */
export const applicationStatusValues = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const;

export type ApplicationStatusValue = (typeof applicationStatusValues)[number];

/**
 * Every text field carries an upper bound. The columns behind them are
 * unbounded Postgres `text`, so without one a single tracked job can be
 * megabytes of notes - the resume router already draws the same lines
 * (`max(255)` on names, `max(20_000)` on job descriptions).
 *
 * The numbers are set where a real value stops and abuse starts: a company
 * name is not 200 characters, and notes on one application are not a novel.
 */
export const TRACKER_FIELD_LIMITS = {
  company: 200,
  position: 200,
  location: 200,
  salary: 100,
  url: 2000,
  notes: 5000,
  contactName: 200,
  contactEmail: 320,
} as const;

export const trackerFormSchema = z.object({
  company: z
    .string()
    .min(1, "Company name is required.")
    .max(
      TRACKER_FIELD_LIMITS.company,
      `Company name must be at most ${TRACKER_FIELD_LIMITS.company} characters.`,
    ),
  position: z
    .string()
    .min(1, "Position is required.")
    .max(
      TRACKER_FIELD_LIMITS.position,
      `Position must be at most ${TRACKER_FIELD_LIMITS.position} characters.`,
    ),
  location: z
    .string()
    .max(
      TRACKER_FIELD_LIMITS.location,
      `Location must be at most ${TRACKER_FIELD_LIMITS.location} characters.`,
    )
    .optional(),
  salary: z
    .string()
    .max(
      TRACKER_FIELD_LIMITS.salary,
      `Salary must be at most ${TRACKER_FIELD_LIMITS.salary} characters.`,
    )
    .optional(),
  status: z.enum(applicationStatusValues),
  // Empty string or a real web link. `z.string().url()` alone is not that
  // check: it accepts `javascript:alert(1)`, which would be stored and then
  // rendered as the card's "View Job Posting" href.
  url: z.union([
    z.literal(""),
    z
      .string()
      .max(
        TRACKER_FIELD_LIMITS.url,
        `Link must be at most ${TRACKER_FIELD_LIMITS.url} characters.`,
      )
      .refine(isSafeHttpUrl, "Please enter a valid http(s) URL."),
  ]),
  notes: z
    .string()
    .max(
      TRACKER_FIELD_LIMITS.notes,
      `Notes must be at most ${TRACKER_FIELD_LIMITS.notes} characters.`,
    )
    .optional(),
  contactName: z
    .string()
    .max(
      TRACKER_FIELD_LIMITS.contactName,
      `Contact name must be at most ${TRACKER_FIELD_LIMITS.contactName} characters.`,
    )
    .optional(),
  contactEmail: z.union([
    z.literal(""),
    z
      .string()
      .max(
        TRACKER_FIELD_LIMITS.contactEmail,
        `Contact email must be at most ${TRACKER_FIELD_LIMITS.contactEmail} characters.`,
      )
      .email("Please enter a valid email address."),
  ]),
});

// 2. Infer the TypeScript type automatically from the schema
export type TrackerFormValues = z.infer<typeof trackerFormSchema>;

export interface CategoryScoreCardProps {
  icon: React.ElementType;
  title: string;
  score: number;
  description: string;
}
