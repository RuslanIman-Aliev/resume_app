import { describe, expect, it } from "vitest";
import { jobMatchAnalysisSchema, resumeAnalysisSchema } from "./schemas";

describe("jobMatchAnalysisSchema", () => {
  it("applies defaults for optional gaps and summary sections", () => {
    const parsed = jobMatchAnalysisSchema.parse({
      matchScore: 82,
      matchingSkills: [
        {
          skill: "TypeScript",
          importance: "High",
        },
      ],
      missingSkills: [],
      coverLetterText: "Cover letter text",
    });

    expect(parsed.requirementsMatch.required).toEqual([]);
    expect(parsed.skillsGap.technical).toEqual([]);
    expect(parsed.keywordsGap.found).toEqual([]);
    expect(parsed.summary.estimatedScoreWithAllImprovements).toBe(0);
    expect(parsed.targetLanguage).toBe("English");
  });

  it("normalizes missing beforeText and afterText in improvements", () => {
    const parsed = jobMatchAnalysisSchema.parse({
      matchScore: 70,
      matchingSkills: [],
      missingSkills: [],
      coverLetterText: "Cover letter text",
      improvements: [
        {
          title: "Rewrite summary",
          description: "Align to role",
          targetSection: "summary",
          beforeText: null,
          afterText: " ",
          suggestions: [],
        },
      ],
    });

    expect(parsed.improvements[0]?.beforeText).toBe(
      "Current resume text is missing for this requirement.",
    );
    expect(parsed.improvements[0]?.afterText).toBe(
      "Add a measurable bullet aligned with this requirement using the XYZ formula.",
    );
  });

  it("rejects matchScore values above 100", () => {
    const result = jobMatchAnalysisSchema.safeParse({
      matchScore: 101,
      matchingSkills: [],
      missingSkills: [],
      coverLetterText: "Cover letter text",
    });

    expect(result.success).toBe(false);
  });
});

describe("resumeAnalysisSchema", () => {
  it("parses valid analysis payload", () => {
    const parsed = resumeAnalysisSchema.parse({
      overallScore: 86,
      categoryScores: {
        contentQuality: 84,
        atsOptimization: 88,
        experience: 82,
        skillsMatch: 89,
      },
      keywords: ["react", "nextjs"],
      strengths: ["Strong impact bullets"],
      quickWins: [
        {
          title: "Add metrics",
          impact: "High",
          timeEstimate: "10 min",
        },
      ],
      improvements: [
        {
          category: "Content",
          impact: "High Impact",
          title: "Improve summary",
          description: "Tailor to role",
          currentText: "Generic summary",
          suggestedText: "Frontend engineer with measurable outcomes",
          tips: ["Mention React", "Add metrics"],
          targetSection: "summary",
        },
      ],
    });

    expect(parsed.overallScore).toBe(86);
    expect(parsed.quickWins[0]?.impact).toBe("High");
    expect(parsed.improvements[0]?.targetSection).toBe("summary");
  });

  it("rejects invalid quick win impact values", () => {
    const result = resumeAnalysisSchema.safeParse({
      overallScore: 86,
      categoryScores: {
        contentQuality: 84,
        atsOptimization: 88,
        experience: 82,
        skillsMatch: 89,
      },
      keywords: [],
      strengths: [],
      quickWins: [
        {
          title: "Add metrics",
          impact: "Critical",
          timeEstimate: "10 min",
        },
      ],
      improvements: [],
    });

    expect(result.success).toBe(false);
  });
});
