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

export const getImportanceStyles = (importance: string) => {
  const imp = importance?.toLowerCase();
  if (imp === "critical")
    return "border-red-500/30 text-red-500 bg-transparent";
  if (imp === "high")
    return "border-yellow-500/30 text-yellow-500 bg-transparent";
  return "border-muted text-muted-foreground bg-transparent";
};

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

{
  /*
    - tailoringTips.currentResumeText and tailoringTips.suggestedRewrite MUST always be strings. NEVER return null.
  "tailoringTips": [
      // Array of EXACTLY 5 to 7 detailed suggestions on how to rewrite their resume for THIS specific job.
      {
        "jobRequirement": string (Quote a specific requirement from the job description),
        "currentResumeText": string (Extract the closest matching bullet point from the candidate's resume. MUST be a string and NEVER null. If no match exists, use exactly: "No direct match found in the resume. Add a new bullet aligned with this requirement."),
        "suggestedRewrite": string (Rewrite the current text using the Google XYZ formula to directly target the jobRequirement. MUST be a string and NEVER null.)
      }
    ], */
}
export function getJobMatchPrompt(resumeText: string, jobDescription: string) {
  return `
  You are an elite Senior Technical Recruiter and ATS (Applicant Tracking System) Specialist. Your expertise lies in analyzing how well a candidate's resume matches a specific job description.

  Your task is to critically compare the provided Candidate Resume against the target Job Description. 

  Your primary goals are:
  1. Extract the company name, job title, and job post URL from the job description if they are present.
    2. Extract experience requirement and salaryRange exactly from the job description text when present.
    3. Detect the language of the job description and return it as targetLanguage (use "English" if unsure).
    4. Calculate a realistic ATS Match Score (0-100) based on keyword overlap, seniority, and required skills.
    5. Identify the exact skills the candidate possesses that match the job description.
    6. Identify critical missing skills or keywords that the ATS will look for but are absent from the resume.
    7. Provide specific "tailoring tips" by taking existing bullet points from the resume and rewriting them to better highlight the requirements found in the job description.
    8. Return additional structured fields for UI cards:
     - requirementsMatch (required + preferred with matched status)
     - skillsGap (technical + soft with matched status + missingCriticalSkills)
     - keywordsGap (found + missing)
     - summary counters and estimated score after applying all improvements
    9. Draft a highly professional, concise, and persuasive Cover Letter that bridges the gap between the candidate's background and the employer's specific needs.

  Data quality rules for the additional structured fields:
  - Use only evidence from the provided resume and job description.
  - Never invent companies, projects, tools, or achievements that do not appear in the input.
    - experience and salaryRange are required when evidence exists in the job description. NEVER return null if relevant text is present.
    - Experience evidence examples include: "5+ years", "3-5 years", "at least 4 years", "Senior", "Lead", "Principal", "3+ years of experience", "3+ лет опыта".
    - Salary evidence examples include: "$120,000 - $150,000", "120k-150k", "up to $180k", "from 90,000 to 120,000", "salary: ...", "compensation: ...".
    - Preserve numeric values and currency exactly as written in the job description.
  - evidence must be a direct quote from resume text when matched=true; otherwise use null.
  - improvements.beforeText and improvements.afterText MUST always be strings. NEVER return null.
  - Each improvement card must be independently renderable in UI using only its own fields.
  - If there is no close matching bullet in the resume, currentResumeText must be exactly: "No direct match found in the resume. Add a new bullet aligned with this requirement."
  - Keep wording concise and ATS-friendly.
  - Generate a large number of actionable improvements. Do not isolate your feedback to only a few points; aim to find every possible weak point, missing keyword, or phrasing issue and provide a highly specific improvement for each.

  You MUST respond ONLY with a valid, raw JSON object. Do not include markdown formatting, explanations, or any text outside the JSON. The JSON must exactly match the following structure:

  {
    "companyName": string or null (Extract from the job description; use null if not present),
    "jobTitle": string or null (Extract from the job description; use null if not present),
    "experience": string or null (Extract experience/seniority exactly from job text. If job text includes experience evidence, this MUST be a non-null string),
    "salaryRange": string or null (Extract salary exactly from job text. If job text includes salary evidence, this MUST be a non-null string),
    "url": string or null (Extract the job post URL if present; use null if not present),
    "targetLanguage": string (e.g., "English", "Russian"; must match the job description language),
    "matchScore": number (0-100),
    "matchingSkills": [
      // Array of 4 to 8 objects highlighting skills the candidate has that the job requires
      {
        "skill": string (e.g., "React.js"),
        "importance": string ("High", "Medium", or "Low" - based on how often it appears in the job description)
      }
    ],
    "improvements": [
      // Array of AT LEAST 6 to 12 improvement cards for UI (split by fields, not one combined string).
      // Find EVERY possible weak point, keyword gap, or phrasing issue and generate a specific improvement.
      {
        "priority": string ("high", "medium", or "low"),
        "title": string (short action title, e.g., "Add Testing Experience"),
        "description": string (1 sentence why this gap affects ATS matching),
        "matchScoreBoost": number (integer boost estimate, e.g., 8),
        "suggestions": [
          string,
          string,
          string
        ],
        "beforeText": string (current weak or missing resume text),
        "afterText": string (improved rewritten version aligned with job requirement)
      }
    ],
    "missingSkills": [
      // Array of 3 to 6 objects highlighting critical skills required by the job but missing from the resume
      {
        "skill": string (e.g., "GraphQL"),
        "impact": string ("High" - if it's a hard requirement, "Medium" - if it's a nice-to-have)
      }
    ],
    
    "requirementsMatch": {
      "required": [
        {
          "requirement": string,
          "matched": boolean,
          "importance": string ("Critical", "High", "Medium", or "Low"),
          "evidence": string or null (direct quote from resume when matched=true)
        }
      ],
      "preferred": [
        {
          "requirement": string,
          "matched": boolean,
          "importance": string ("Critical", "High", "Medium", or "Low"),
          "evidence": string or null (direct quote from resume when matched=true)
        }
      ]
    },
    "skillsGap": {
      "technical": [
        {
          "skill": string,
          "importance": string ("Critical", "High", "Medium", or "Low"),
          "matched": boolean
        }
      ],
      "soft": [
        {
          "skill": string,
          "importance": string ("Critical", "High", "Medium", or "Low"),
          "matched": boolean
        }
      ],
      "missingCriticalSkills": [string]
    },
    "keywordsGap": {
      "found": [string],
      "missing": [string]
    },
    "summary": {
      "requiredMatched": number,
      "requiredTotal": number,
      "preferredMatched": number,
      "preferredTotal": number,
      "estimatedScoreWithAllImprovements": number (0-100)
    },
    "coverLetterText": string (A highly personalized, 5-paragraph cover letter written from the candidate's perspective to the hiring manager. Focus on the value the candidate brings to the specific challenges mentioned in the job description. Do not use generic templates. Write the cover letter in targetLanguage.)
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
