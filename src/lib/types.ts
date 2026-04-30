import z from "zod";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
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

type RouterOutput = inferRouterOutputs<AppRouter>;
interface ApplicationSummary {
  estimatedScoreWithAllImprovements: number;
}
type RawApplicationData =
  RouterOutput["resume"]["getJobMatchResult"]["application"];

export type ApplicationData = Omit<
  RawApplicationData,
  "improvements" | "summary"
> & {
  improvements: ImprovementTip[] | null;
  summary: ApplicationSummary | null;
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
