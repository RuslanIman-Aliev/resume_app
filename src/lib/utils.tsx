import { Badge } from "@/components/ui/badge";
import { clsx, type ClassValue } from "clsx";
import { Briefcase, Code, FileText, GraduationCap, Target } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPrompt(resumeText: string, targetRole: string) {
  return `
  You are an elite Senior Technical Recruiter at Google and an ATS Optimization Expert. You have reviewed over 100,000 resumes and know exactly how Workday, Greenhouse, and Lever algorithms rank candidates.

  Your task is to critically analyze the provided resume against the target role of: ${targetRole}.

  Your primary goal is to find weak, generic responsibilities and rewrite them into powerful, highly measurable achievements using the famous Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]." 
  
  You must eliminate weak verbs (e.g., "helped", "worked on") and replace them with strong action verbs (e.g., "architected", "scaled", "drove"). You must inject specific metrics, percentages, and business impact into your suggestions.

  You MUST respond ONLY with a valid, raw JSON object. Do not include markdown formatting, explanations, or any text outside the JSON. The JSON must exactly match the following structure:

  {
    "overallScore": number (0-100),
    "categoryScores": {
      "contentQuality": number (0-100),
      "atsOptimization": number (0-100),
      "experience": number (0-100),
      "skillsMatch": number (0-100)
    },
    "strengths": [
      // Array of 3 to 5 short strings highlighting what is currently good
    ],
    "keywords": [
      // Array of 3 to 5 keywords that are strictly required for ${targetRole} and should be injected into the ATS
    ],
    "quickWins": [
      // Array of 2 to 3 objects for fast fixes
      {
        "title": string (e.g., "Add 2 more backend skills"),
        "impact": string ("High", "Medium", or "Low"),
        "timeEstimate": string (e.g., "5 min")
      }
    ],
    "improvements": [
      // Array of EXACTLY 5 to 8 detailed suggestions. 
      {
        "category": string ("Content", "Skills", "Keywords", "Format", or "Experience"),
        "impact": string ("High Impact", "Medium Impact", or "Low Impact"),
        "title": string (e.g., "Transform duties into quantifiable achievements"),
        "description": string (Explain exactly why this change will increase the candidate's ATS score and impress a human recruiter),
        
        // YOU MUST ALWAYS PROVIDE THESE TWO FIELDS. NEVER LEAVE THEM NULL.
        "currentText": string (You MUST extract a direct, weak quote from the candidate's provided resume text. Do not make this up.),
        "suggestedText": string (You MUST rewrite the currentText using the Google XYZ formula. Add realistic placeholder metrics like "by 25%" or "saving $10k" if the candidate didn't provide any.),
        
        "tips": [
          // Array of 2 to 3 actionable, McKinsey-level tips (e.g., "Lead with the business impact, not the technology used")
        ]
      }
    ]
  }

  Here is the candidate's parsed resume text:
  """
  ${resumeText}
  """
  `;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case "tailored":
      return (
        <Badge className="bg-success/10 text-success border-0">
          Resume Tailored
        </Badge>
      );
    case "ANALYZED":
      return (
        <Badge className="bg-primary/10 text-primary border-0">Analyzed</Badge>
      );
    case "reviewed":
      return (
        <Badge className="bg-muted text-muted-foreground border-0">
          Reviewed
        </Badge>
      );
    default:
      return null;
  }
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function getRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = then - now;
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  if (Math.abs(diffSecs) < 60) return rtf.format(diffSecs, "second");
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");
  return rtf.format(diffYears, "year");
}

export function getScoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-chart-4";
  return "text-chart-5";
}

const priorityConfig = {
  high: {
    label: "High Impact",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  medium: {
    label: "Medium Impact",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  low: {
    label: "Low Impact",
    color: "bg-muted text-muted-foreground border-border",
  },
};

export const getPriorityConfig = (priority: unknown) => {
  if (typeof priority === "string") {
    const normalized = priority.toLowerCase().split(" ")[0]; // Get the first word (e.g., "high" from "High Impact")
    if (normalized in priorityConfig) {
      return priorityConfig[normalized as keyof typeof priorityConfig];
    }
  }
  return priorityConfig.low;
};

const categoryConfig = {
  content: {
    icon: FileText,
    label: "Content",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  skills: {
    icon: Code,
    label: "Skills",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  experience: {
    icon: Briefcase,
    label: "Experience",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  format: {
    icon: Target,
    label: "Format",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  keywords: {
    icon: GraduationCap,
    label: "Keywords",
    color: "bg-primary/20 text-primary border-primary/30",
  },
};

export const getCategoryConfig = (category: unknown) => {
  if (typeof category === "string") {
    const normalized = category.toLowerCase();

    if (normalized in categoryConfig) {
      return categoryConfig[normalized as keyof typeof categoryConfig];
    }
  }
  return categoryConfig.content;
};

export function getJobMatchPrompt(resumeText: string, jobDescription: string) {
  return `
  You are an elite Senior Technical Recruiter and ATS (Applicant Tracking System) Specialist. Your expertise lies in analyzing how well a candidate's resume matches a specific job description.

  Your task is to critically compare the provided Candidate Resume against the target Job Description. 

  Your primary goals are:
  1. Calculate a realistic ATS Match Score (0-100) based on keyword overlap, seniority, and required skills.
  2. Identify the exact skills the candidate possesses that match the job description.
  3. Identify critical missing skills or keywords that the ATS will look for but are absent from the resume.
  4. Provide specific "tailoring tips" by taking existing bullet points from the resume and rewriting them to better highlight the requirements found in the job description.
  5. Draft a highly professional, concise, and persuasive Cover Letter that bridges the gap between the candidate's background and the employer's specific needs.

  You MUST respond ONLY with a valid, raw JSON object. Do not include markdown formatting, explanations, or any text outside the JSON. The JSON must exactly match the following structure:

  {
    "matchScore": number (0-100),
    "matchingSkills": [
      // Array of 4 to 8 objects highlighting skills the candidate has that the job requires
      {
        "skill": string (e.g., "React.js"),
        "importance": string ("High", "Medium", or "Low" - based on how often it appears in the job description)
      }
    ],
    "missingSkills": [
      // Array of 3 to 6 objects highlighting critical skills required by the job but missing from the resume
      {
        "skill": string (e.g., "GraphQL"),
        "impact": string ("High" - if it's a hard requirement, "Medium" - if it's a nice-to-have)
      }
    ],
    "tailoringTips": [
      // Array of EXACTLY 5 to 7 detailed suggestions on how to rewrite their resume for THIS specific job.
      {
        "jobRequirement": string (Quote a specific requirement from the job description),
        "currentResumeText": string (Extract the closest matching bullet point from the candidate's resume. If no match exists, explain where they should add a new bullet),
        "suggestedRewrite": string (Rewrite the current text using the Google XYZ formula to directly target the jobRequirement. Make it powerful and measurable.)
      }
    ],
    "coverLetterText": string (A highly personalized, 5-paragraph cover letter written from the candidate's perspective to the hiring manager. Focus on the value the candidate brings to the specific challenges mentioned in the job description. Do not use generic templates.)
  }

  Here is the Job Description:
  """
  ${jobDescription}
  """

  Here is the Candidate's Resume:
  """
  ${resumeText}
  """
  `;
}