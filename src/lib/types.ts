import z from "zod";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "./schemas";

export const signUpFormSchema = z
  .object({
    name: z.string().min(1, "Name must be at least 3 characters."),
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
  name: z.string().max(50, "Name must be at most 50 characters.").optional(),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export type SignInFormData = z.infer<typeof signInFormSchema>;

export interface ImprovementTip {
  title: string;
  priority: string;
  afterText: string;
  beforeText: string;
  description: string;
  suggestions: string[];
  matchScoreBoost: number;
  category?: string;
  targetSection: "summary" | "experience" | "education" | "projects" | "skills";
  targetId?: string;
  isApplied?: boolean;
}

export interface ResumeBlockInfo {
  id: string;
  company: string;
  role: string;
  date: string;
  bullets: {
    id: string;
    text: string;
  }[];
}

export interface EducationBlockInfo {
  id: string;
  institution: string;
  degree: string;
  date: string;
  bullets: {
    id: string;
    text: string;
  }[];
}

export interface ProjectBlockInfo {
  id: string;
  name: string;
  date: string;
  bullets: {
    id: string;
    text: string;
  }[];
}

export interface StructuredResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    links?: string[];
    summary: string;
  };
  experience: ResumeBlockInfo[];
  education: EducationBlockInfo[];
  projects?: ProjectBlockInfo[];
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
  company?: string;
  /** Job title/position from the job posting. */
  position?: string;
  /** Job location (e.g., city, state, remote). */
  location?: string;
  /** Salary range for the position. */
  salary?: string;
  /** Current status of the application (saved, applied, screening, interview, offer, rejected). */
  status: string;
  /** Date when the application was submitted. */
  appliedDate?: string;
  /** Date when the record was last updated. */
  lastUpdated?: string;
  /** Job match score between 0-100, null if not yet analyzed. */
  matchScore: number | null;
  /** Description of the next step in the application process. */
  nextStep?: string;
  /** Date of the next step. */
  nextStepDate?: string;
  /** URL to the job posting. */
  url?: string;
  /** Timestamp when the record was created. */
  createdAt?: Date;
  /** Timestamp when the record was last updated. */
  updatedAt?: Date;
  /** Associated resume metadata. */
  resume?: {
    /** Name of the resume used for this application. */
    resumeName: string;
  };
};

export type JobMatchAnalysis = z.infer<typeof jobMatchAnalysisSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

export type SkillImportance = "Critical" | "High" | "Medium" | "Low";

export type SkillGapItem = {
  skill: string;
  matched: boolean;
  importance: SkillImportance;
};

export type SkillsGapData = {
  soft: SkillGapItem[];
  technical: SkillGapItem[];
  missingCriticalSkills: string[];
};

export type KeywordsGapData = {
  found: string[];
  missing: string[];
};

export type RequirementImportance = "Critical" | "High" | "Medium" | "Low";

export type RequirementItem = {
  matched: boolean;
  evidence: string | null;
  importance: RequirementImportance;
  requirement: string;
};

export type RequirementsMatchData = {
  required: RequirementItem[];
  preferred: RequirementItem[];
};
