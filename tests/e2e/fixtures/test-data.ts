export const testUser = {
  name: "E2E User",
  email: "e2e.user@example.com",
  password: "Password123!",
};

/**
 * Enough cards in one column to prove the column scrolls rather than paginates.
 * They all sit in `saved`, which is the column the board opens on.
 */
export const seedTrackerPositions = Array.from({ length: 10 }, (_, index) => ({
  id: `tracker_e2e_${index + 1}`,
  company: `Column Co ${index + 1}`,
  position: "Column Scroll Engineer",
  location: "Remote",
  status: "saved",
}));

export const seedResume = {
  id: "resume_e2e_1",
  fileName: "e2e-resume.pdf",
  resumeName: "Test Resume",
  postedRole: "Frontend Engineer",
  resumeLink: "https://example.com/resume.pdf",
  parsedContent: "Sample parsed content for analysis.",
  resumePreviewLink: null as string | null,
  status: "ANALYZED",
};

export const seedAnalysis = {
  id: "analysis_e2e_1",
  overallScore: 88,
  contentQuality: 85,
  atsOptimization: 90,
  experience: 82,
  skillsMatch: 87,
  keywords: ["typescript", "react", "nextjs"],
  strengths: ["Clear impact statements", "Strong project results"],
  quickWins: [
    {
      title: "Add metrics to achievements",
      impact: "High",
      timeEstimate: "10-15 min",
    },
    {
      title: "Clarify scope of ownership",
      impact: "Medium",
      timeEstimate: "5-10 min",
    },
  ],
  improvements: [
    {
      title: "Strengthen the summary for the role",
      description: "Make the summary more specific to frontend work.",
      currentText: "Experienced engineer building web apps.",
      suggestedText:
        "Frontend engineer with 5+ years building React and Next.js products.",
      tips: [
        "Mention React and TypeScript explicitly.",
        "Add a quantified impact statement.",
      ],
      category: "content",
      impact: "High",
    },
  ],
};
