import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPrompt(resumeText: string, targetRole: string) {
  return `
  You are an expert Senior Technical Recruiter who reviews 200 resumes a day. Your task is to critically analyze the provided resume against the target role of ${targetRole}. 

  Your primary goal is to find generic responsibilities and rewrite them into measurable results, ensuring the candidate's value is impossible to ignore.

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
      // Array of 3 to 5 keywords that are relevant to the target role and should be included in the resume
    ],
    "quickWins": [
      // Array of 2 to 3 objects for fast fixes
      {
        "title": string (e.g., "Add 2 more skills"),
        "impact": string ("High", "Medium", or "Low"),
        "timeEstimate": string (e.g., "5 min")
      }
    ],
    "improvements": [
      // Array of 3 to 6 detailed suggestions for rewriting bullet points
      {
        "category": string ("Content", "Skills", "Keywords", "Format", or "Experience"),
        "impact": string ("High Impact", "Medium Impact", or "Low Impact"),
        "title": string (e.g., "Add quantifiable achievements to your experience"),
        "description": string (Why this matters to a recruiter),
        "currentText": string (Quote a weak sentence directly from the resume, leave null if not applicable),
        "suggestedText": string (Rewrite the currentText to be highly measurable and impactful, leave null if not applicable),
        "tips": [
          // Array of 2 to 3 actionable tips (e.g., "Include percentages or dollar amounts")
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
