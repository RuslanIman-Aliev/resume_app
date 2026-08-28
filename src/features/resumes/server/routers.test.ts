import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/trpc/init";
import { resumeRouter } from "@/features/resumes/server/routers";
import { resetRateLimit } from "@/lib/rate-limit";

const prismaMock = vi.hoisted(() => ({
  resume: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  resumeAnalysis: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  jobApplication: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  api: {
    getSession: vi.fn(),
  },
}));

const headersMock = vi.hoisted(() => vi.fn());

const inngestMock = vi.hoisted(() => ({
  send: vi.fn(),
}));

// The real module is `server-only`, which throws under the jsdom test env.
const deleteUploadThingFilesByUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/inngest/client", () => ({
  inngest: inngestMock,
}));

vi.mock("@/lib/uploadthing-files", () => ({
  deleteUploadThingFilesByUrl: deleteUploadThingFilesByUrlMock,
}));

const createCaller = createCallerFactory(resumeRouter);
const session = { user: { id: "user_123" } };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimit();
  headersMock.mockResolvedValue(new Headers());
  authMock.api.getSession.mockResolvedValue(session);
});

describe("resumeRouter", () => {
  it("creates a resume for the current user", async () => {
    const resume = { id: "resume_1" };
    prismaMock.resume.create.mockResolvedValue(resume);

    const caller = createCaller({});
    const input = {
      fileName: "resume.pdf",
      fileUrl: "https://example.com/resume.pdf",
      resumeName: "Resume",
      postedRole: "Frontend Engineer",
      thumbnailUrl: "https://example.com/resume.jpg",
      parsedContent: "Parsed content",
    };

    const result = await caller.create(input);

    expect(prismaMock.resume.create).toHaveBeenCalledWith({
      data: {
        fileName: input.fileName,
        resumeName: input.resumeName,
        postedRole: input.postedRole,
        resumeLink: input.fileUrl,
        userId: session.user.id,
        resumePreviewLink: input.thumbnailUrl,
        parsedContent: "<p>Parsed content</p>",
      },
    });
    expect(result).toEqual({ resume });
  });

  it("sanitizes malicious parsed content before saving", async () => {
    const resume = { id: "resume_2" };
    prismaMock.resume.create.mockResolvedValue(resume);

    const caller = createCaller({});
    await caller.create({
      fileName: "resume.pdf",
      fileUrl: "https://example.com/resume.pdf",
      resumeName: "Resume",
      postedRole: "Frontend Engineer",
      thumbnailUrl: "https://example.com/resume.jpg",
      parsedContent:
        "<script>alert(1)</script><p>Hello</p><img src=x onerror=alert(2)>",
    });

    expect(prismaMock.resume.create).toHaveBeenCalledWith({
      data: {
        fileName: "resume.pdf",
        resumeName: "Resume",
        postedRole: "Frontend Engineer",
        resumeLink: "https://example.com/resume.pdf",
        userId: session.user.id,
        resumePreviewLink: "https://example.com/resume.jpg",
        parsedContent: "<p>Hello</p>",
      },
    });
  });

  it("converts plain-text bullet lines into lists", async () => {
    const resume = { id: "resume_4" };
    prismaMock.resume.create.mockResolvedValue(resume);

    const caller = createCaller({});
    await caller.create({
      fileName: "resume.doc",
      fileUrl: "https://example.com/resume.doc",
      resumeName: "Resume",
      postedRole: "Frontend Engineer",
      thumbnailUrl: "https://example.com/resume.jpg",
      parsedContent:
        "Профиль\nFullstack Web Developer with 3 years of experience\n\nНавыки\n- React\n- Node.js\n- PostgreSQL",
    });

    expect(prismaMock.resume.create).toHaveBeenCalledWith({
      data: {
        fileName: "resume.doc",
        resumeName: "Resume",
        postedRole: "Frontend Engineer",
        resumeLink: "https://example.com/resume.doc",
        userId: session.user.id,
        resumePreviewLink: "https://example.com/resume.jpg",
        parsedContent:
          "<p>Профиль</p><p>Fullstack Web Developer with 3 years of experience</p><p>Навыки</p><ul><li>React</li><li>Node.js</li><li>PostgreSQL</li></ul>",
      },
    });
  });

  it("preserves formatted DOCX content when saving", async () => {
    const resume = { id: "resume_3" };
    prismaMock.resume.create.mockResolvedValue(resume);

    const caller = createCaller({});
    await caller.create({
      fileName: "resume.docx",
      fileUrl: "https://example.com/resume.docx",
      resumeName: "Resume",
      postedRole: "Frontend Engineer",
      thumbnailUrl: "https://example.com/resume.jpg",
      parsedContent:
        "<p><strong>Frontend Engineer</strong></p><ul><li>Built reusable UI</li><li>Improved performance</li></ul>",
    });

    expect(prismaMock.resume.create).toHaveBeenCalledWith({
      data: {
        fileName: "resume.docx",
        resumeName: "Resume",
        postedRole: "Frontend Engineer",
        resumeLink: "https://example.com/resume.docx",
        userId: session.user.id,
        resumePreviewLink: "https://example.com/resume.jpg",
        parsedContent:
          "<p><strong>Frontend Engineer</strong></p><ul><li>Built reusable UI</li><li>Improved performance</li></ul>",
      },
    });
  });

  it("returns empty results when no resumes exist", async () => {
    prismaMock.resume.count.mockResolvedValue(0);

    const caller = createCaller({});
    const result = await caller.getAll({ limit: 6, page: 2 });

    expect(result).toEqual({
      resumes: [],
      pagination: { totalCount: 0, pageCount: 1, currentPage: 1 },
    });
    expect(prismaMock.resume.findMany).not.toHaveBeenCalled();
  });

  it("rejects a status filter outside the ResumeStatus enum", async () => {
    const caller = createCaller({});

    // The filter arrives from a `?status=` URL parameter and is spread straight
    // into the `where` clause, so anything outside the enum has to be refused
    // before it reaches Prisma. "draft" is the pre-migration spelling.
    await expect(caller.getAll({ status: "draft" as never })).rejects.toThrow();

    expect(prismaMock.resume.count).not.toHaveBeenCalled();
    expect(prismaMock.resume.findMany).not.toHaveBeenCalled();
  });

  it("applies a valid status filter to both the count and the page query", async () => {
    prismaMock.resume.count.mockResolvedValue(1);
    prismaMock.resume.findMany.mockResolvedValue([{ id: "resume_1" }]);

    const caller = createCaller({});
    await caller.getAll({ status: "ANALYZED" });

    // Both queries have to carry the same filter, otherwise the total count
    // and the returned page describe different sets and pagination lies.
    expect(prismaMock.resume.count).toHaveBeenCalledWith({
      where: { userId: session.user.id, status: "ANALYZED" },
    });
    expect(prismaMock.resume.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: session.user.id, status: "ANALYZED" },
      }),
    );
  });

  it("paginates results and clamps page values", async () => {
    prismaMock.resume.count.mockResolvedValue(10);
    const resumes = [{ id: "resume_1" }];
    prismaMock.resume.findMany.mockResolvedValue(resumes);

    const caller = createCaller({});
    const result = await caller.getAll({ limit: 6, page: 5 });

    expect(prismaMock.resume.findMany).toHaveBeenCalledWith({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      skip: 6,
      select: {
        id: true,
        fileName: true,
        resumeName: true,
        postedRole: true,
        resumeLink: true,
        resumePreviewLink: true,
        createdAt: true,
        status: true,
      },
    });
    expect(result).toEqual({
      resumes,
      pagination: { totalCount: 10, pageCount: 2, currentPage: 2 },
    });
  });

  it("fetches resumes with latest analyses", async () => {
    const resumes = [
      {
        id: "resume_1",
        fileName: "resume.pdf",
        resumeName: "Resume",
        postedRole: "Role",
        createdAt: new Date("2026-04-01T00:00:00Z"),
        status: "ANALYZED",
        analysis: [
          {
            id: "analysis_1",
            overallScore: 86,
            keywords: ["typescript"],
            createdAt: new Date("2026-04-02T00:00:00Z"),
          },
        ],
      },
    ];
    prismaMock.resume.findMany.mockResolvedValue(resumes);

    const caller = createCaller({});
    const result = await caller.getResumesAndAnalyses();

    expect(prismaMock.resume.findMany).toHaveBeenCalled();
    expect(result).toEqual({ resumes });
  });

  it("throws when parsed content is missing", async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.getParsedContent({ resumeId: "resume_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns parsed content when resume exists", async () => {
    const resume = {
      parsedContent: "Parsed content",
      resumeName: "Resume",
      postedRole: "Role",
    };
    prismaMock.resume.findFirst.mockResolvedValue(resume);

    const caller = createCaller({});
    const result = await caller.getParsedContent({ resumeId: "resume_1" });

    expect(prismaMock.resume.findFirst).toHaveBeenCalledWith({
      where: { id: "resume_1", userId: session.user.id },
      select: {
        parsedContent: true,
        resumeName: true,
        postedRole: true,
        resumeLink: true,
      },
    });
    expect(result).toEqual({ resume });
  });

  it("triggers analysis when resume exists", async () => {
    const resume = {
      parsedContent: "Parsed content",
      resumeName: "Resume",
      postedRole: "Role",
    };
    prismaMock.resume.findFirst.mockResolvedValue(resume);
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});
    const result = await caller.triggerAnalysis({ resumeId: "resume_1" });

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "app/resume.analyzed",
      data: {
        resumeId: "resume_1",
        userId: session.user.id,
        parsedContent: resume.parsedContent,
        postedRole: resume.postedRole,
        resumeName: resume.resumeName,
      },
    });
    expect(result).toEqual({ success: true });
  });

  it("puts the throttle key on every event that starts a paid AI run", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      parsedContent: "Parsed content",
      resumeName: "Resume",
      postedRole: "Role",
      structuredData: null,
    });
    prismaMock.jobApplication.create.mockResolvedValue({ id: "application_9" });
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});
    await caller.triggerAnalysis({ resumeId: "resume_1" });
    await caller.triggerJobMatchAnalysis({
      resumeId: "resume_1",
      jobDescription: "Job description",
    });

    // Both Inngest functions throttle and limit concurrency on
    // `event.data.userId`. If a payload ever loses that field the key resolves
    // to nothing and the per-user ceiling silently becomes a single ceiling
    // shared by everyone - which reads as "the limit still works" right up
    // until two people use the product at the same time.
    expect(inngestMock.send).toHaveBeenCalledTimes(2);
    for (const [event] of inngestMock.send.mock.calls) {
      expect(event.data).toMatchObject({ userId: session.user.id });
    }
  });

  it("throws when triggering analysis for missing resume", async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.triggerAnalysis({ resumeId: "resume_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rate-limits repeated analysis triggers for the same user", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      parsedContent: "Parsed content",
      resumeName: "Resume",
      postedRole: "Role",
    });
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});

    // The limit is 5 triggers per user per window.
    for (let i = 0; i < 5; i += 1) {
      await caller.triggerAnalysis({ resumeId: "resume_1" });
    }
    expect(inngestMock.send).toHaveBeenCalledTimes(5);

    await expect(
      caller.triggerAnalysis({ resumeId: "resume_1" }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    // The blocked request must not have dispatched a job.
    expect(inngestMock.send).toHaveBeenCalledTimes(5);
  });

  it("returns the latest analysis result", async () => {
    const analysis = {
      id: "analysis_1",
      resumeId: "resume_1",
      overallScore: 82,
      keywords: ["node"],
      strengths: ["Impact"],
      quickWins: [{ tip: "Add metrics" }],
      improvements: [{ tip: "Clarify summary" }],
      createdAt: new Date("2026-04-03T00:00:00Z"),
      resume: {
        resumeName: "Resume",
        postedRole: "Role",
      },
    };
    prismaMock.resumeAnalysis.findFirst.mockResolvedValue(analysis);

    const caller = createCaller({});
    const result = await caller.getAnalysisResult({ resumeId: "resume_1" });

    expect(Array.isArray(result.analysis.strengths)).toBe(true);
    expect(Array.isArray(result.analysis.quickWins)).toBe(true);
    expect(Array.isArray(result.analysis.improvements)).toBe(true);
    expect(result.analysis).toMatchObject({
      id: analysis.id,
      resumeId: analysis.resumeId,
      resume: analysis.resume,
    });
  });

  it("throws when analysis is missing", async () => {
    prismaMock.resumeAnalysis.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.getAnalysisResult({ resumeId: "resume_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fetches latest analyses for dashboard", async () => {
    const analyses = [
      {
        overallScore: 75,
        keywords: ["react"],
        createdAt: new Date("2026-04-04T00:00:00Z"),
        resume: {
          id: "resume_1",
          resumeName: "Resume",
          postedRole: "Role",
          status: "ANALYZED",
        },
      },
    ];
    prismaMock.resumeAnalysis.findMany.mockResolvedValue(analyses);

    const caller = createCaller({});
    const result = await caller.getLatest4Analyses();

    expect(prismaMock.resumeAnalysis.findMany).toHaveBeenCalledWith({
      where: { resume: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        overallScore: true,
        keywords: true,
        createdAt: true,
        resume: {
          select: {
            id: true,
            resumeName: true,
            postedRole: true,
            status: true,
          },
        },
      },
    });
    expect(result).toEqual({ analyses });
  });

  it("returns analysis count", async () => {
    prismaMock.resumeAnalysis.count.mockResolvedValue(5);

    const caller = createCaller({});
    const result = await caller.getAnalysesCount();

    expect(result).toEqual({ count: 5 });
  });

  it("throws when improvements are missing", async () => {
    prismaMock.resumeAnalysis.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.getImprovements({ resumeId: "resume_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns improvements for a resume", async () => {
    const improvements = [{ tip: "Add metrics" }];
    prismaMock.resumeAnalysis.findFirst.mockResolvedValue({ improvements });

    const caller = createCaller({});
    const result = await caller.getImprovements({ resumeId: "resume_1" });

    expect(result).toEqual({ improvements });
  });

  it("throws when job match analysis lacks parsed content", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      parsedContent: "  ",
      structuredData: null,
    });

    const caller = createCaller({});

    await expect(
      caller.triggerJobMatchAnalysis({
        resumeId: "resume_1",
        jobDescription: "Job description",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(prismaMock.jobApplication.create).not.toHaveBeenCalled();
  });

  it("triggers job match analysis when parsed content exists", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      parsedContent: "Parsed content",
      structuredData: null,
    });
    prismaMock.jobApplication.create.mockResolvedValue({
      id: "application_2",
    });
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});
    const result = await caller.triggerJobMatchAnalysis({
      resumeId: "resume_1",
      jobDescription: "Job description",
    });

    expect(prismaMock.resume.findFirst).toHaveBeenCalledWith({
      where: {
        id: "resume_1",
        userId: session.user.id,
      },
      select: {
        parsedContent: true,
        structuredData: true,
      },
    });

    expect(prismaMock.jobApplication.create).toHaveBeenCalledWith({
      data: {
        userId: session.user.id,
        resumeId: "resume_1",
        jobDescription: "Job description",
        status: "TO_APPLY",
      },
    });

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "app/job-matched.analyzed",
      data: {
        applicationId: "application_2",
        userId: session.user.id,
        resumeId: "resume_1",
        jobDescription: "Job description",
        parsedContent: "Parsed content",
      },
    });
    expect(result).toEqual({ applicationId: "application_2" });
  });

  it("blocks job match analysis for resume owned by another user", async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.triggerJobMatchAnalysis({
        resumeId: "resume_foreign",
        jobDescription: "Foreign resume probe",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(prismaMock.jobApplication.create).not.toHaveBeenCalled();
    expect(inngestMock.send).not.toHaveBeenCalled();
  });

  it("throws when job match result is missing", async () => {
    prismaMock.jobApplication.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.getJobMatchResult({ applicationId: "application_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns job match result when available", async () => {
    const application = {
      id: "application_3",
      resumeId: "resume_1",
      status: "ANALYZED",
    };
    prismaMock.jobApplication.findFirst.mockResolvedValue(application);

    const caller = createCaller({});
    const result = await caller.getJobMatchResult({
      applicationId: "application_3",
    });

    expect(prismaMock.jobApplication.findFirst).toHaveBeenCalledWith({
      where: {
        id: "application_3",
        userId: session.user.id,
      },
    });
    expect(result).toEqual({ application, status: "ANALYZED" });
  });

  it("returns a pending job match result while analysis is running", async () => {
    prismaMock.jobApplication.findFirst.mockResolvedValue({
      id: "application_5",
      resumeId: "resume_1",
      status: "TO_APPLY",
    });

    const caller = createCaller({});
    const result = await caller.getJobMatchResult({
      applicationId: "application_5",
    });

    expect(result).toEqual({ application: null, status: "TO_APPLY" });
  });

  it("uses structuredData payload when triggering job match analysis", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      parsedContent: "Fallback parsed content",
      structuredData: {
        personalInfo: { summary: "Senior frontend engineer" },
        skills: ["React", "TypeScript"],
      },
    });
    prismaMock.jobApplication.create.mockResolvedValue({
      id: "application_4",
    });
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});
    await caller.triggerJobMatchAnalysis({
      resumeId: "resume_1",
      jobDescription: "Need frontend engineer",
    });

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "app/job-matched.analyzed",
      data: {
        applicationId: "application_4",
        userId: session.user.id,
        resumeId: "resume_1",
        jobDescription: "Need frontend engineer",
        parsedContent: JSON.stringify(
          {
            personalInfo: { summary: "Senior frontend engineer" },
            skills: ["React", "TypeScript"],
          },
          null,
          2,
        ),
      },
    });
  });

  it("applies summary improvement and replaces parsed content text", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      parsedContent: "<p>Old summary text</p><p>Other line</p>",
      structuredData: {
        personalInfo: { summary: "Old summary text" },
      },
    });
    prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.jobApplication.findFirst.mockResolvedValue({
      id: "app_1",
      improvements: [
        {
          title: "Strengthen Summary",
          beforeText: "Old summary text",
          afterText: "New summary text",
          targetSection: "summary",
        },
      ],
    });
    prismaMock.jobApplication.update.mockResolvedValue({});

    const caller = createCaller({});
    const result = await caller.applyImprovement({
      resumeId: "resume_1",
      applicationId: "app_1",
      targetSection: "summary",
      previousText: "Old summary text",
      newText: "New summary text",
    });

    expect(prismaMock.resume.updateMany).toHaveBeenCalledWith({
      where: {
        id: "resume_1",
        userId: session.user.id,
      },
      data: {
        structuredData: {
          personalInfo: { summary: "New summary text" },
        },
        parsedContent: "<p>New summary text</p><p>Other line</p>",
      },
    });

    // Check that jobApplication was updated with isApplied flag
    expect(prismaMock.jobApplication.update).toHaveBeenCalledWith({
      where: { id: "app_1" },
      data: {
        improvements: [
          {
            title: "Strengthen Summary",
            beforeText: "Old summary text",
            afterText: "New summary text",
            targetSection: "summary",
            isApplied: true,
          },
        ],
      },
    });

    expect(result).toEqual({ success: true, changed: true });
  });

  it("adds a new unique skill and appends text when previous text is absent", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      parsedContent: "Existing parsed content",
      structuredData: {
        skills: ["React", "TypeScript"],
      },
    });
    prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

    const caller = createCaller({});
    await caller.applyImprovement({
      resumeId: "resume_1",
      targetSection: "skills",
      newText: "Node.js",
    });

    expect(prismaMock.resume.updateMany).toHaveBeenCalledWith({
      where: {
        id: "resume_1",
        userId: session.user.id,
      },
      data: {
        structuredData: {
          skills: ["React", "TypeScript", "Node.js"],
        },
        parsedContent: "<p>Existing parsed content</p><p>Node.js</p>",
      },
    });
  });

  it("updates parsed content when structured data is missing", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      structuredData: null,
      parsedContent: "Any",
    });
    prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

    const caller = createCaller({});

    await caller.applyImprovement({
      resumeId: "resume_1",
      targetSection: "summary",
      newText: "Updated summary",
    });

    expect(prismaMock.resume.updateMany).toHaveBeenCalledWith({
      where: {
        id: "resume_1",
        userId: session.user.id,
      },
      data: {
        parsedContent: "<p>Any</p><p>Updated summary</p>",
      },
    });
  });

  it("throws PRECONDITION_FAILED when applyImprovement does not change data", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      parsedContent: "Summary stays same",
      structuredData: {
        personalInfo: { summary: "Summary stays same" },
      },
    });

    const caller = createCaller({});

    await expect(
      caller.applyImprovement({
        resumeId: "resume_1",
        targetSection: "summary",
        newText: "Summary stays same",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(prismaMock.resume.updateMany).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when scoped resume update is rejected", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      parsedContent: "Old summary text",
      structuredData: {
        personalInfo: { summary: "Old summary text" },
      },
    });
    prismaMock.resume.updateMany.mockResolvedValue({ count: 0 });

    const caller = createCaller({});

    await expect(
      caller.applyImprovement({
        resumeId: "resume_1",
        targetSection: "summary",
        previousText: "Old summary text",
        newText: "Updated summary text",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("marks the resume analysis suggestion applied when there is no application", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: "resume_1",
      parsedContent: "Old summary text",
      structuredData: {
        personalInfo: { summary: "Old summary text" },
      },
    });
    prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.resumeAnalysis.findFirst.mockResolvedValue({
      id: "analysis_1",
      improvements: [
        {
          title: "Strengthen Summary",
          currentText: "Old summary text",
          suggestedText: "New summary text",
          targetSection: "summary",
        },
        {
          title: "Unrelated",
          currentText: "Something else",
          suggestedText: "Another thing",
          targetSection: "skills",
        },
      ],
    });
    prismaMock.resumeAnalysis.update.mockResolvedValue({});

    const caller = createCaller({});
    await caller.applyImprovement({
      resumeId: "resume_1",
      targetSection: "summary",
      previousText: "Old summary text",
      newText: "New summary text",
    });

    expect(prismaMock.resumeAnalysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: {
        improvements: [
          {
            title: "Strengthen Summary",
            currentText: "Old summary text",
            suggestedText: "New summary text",
            targetSection: "summary",
            isApplied: true,
          },
          {
            title: "Unrelated",
            currentText: "Something else",
            suggestedText: "Another thing",
            targetSection: "skills",
          },
        ],
      },
    });
    expect(prismaMock.jobApplication.update).not.toHaveBeenCalled();
  });

  it("deletes stored files after removing a resume", async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      resumeLink: "https://utfs.io/f/file-key",
      resumePreviewLink: "https://utfs.io/f/preview-key",
    });
    prismaMock.resume.deleteMany.mockResolvedValue({ count: 1 });

    const caller = createCaller({});
    const result = await caller.deleteResume({ resumeId: "resume_1" });

    expect(prismaMock.resume.deleteMany).toHaveBeenCalledWith({
      where: { id: "resume_1", userId: session.user.id },
    });
    expect(deleteUploadThingFilesByUrlMock).toHaveBeenCalledWith(
      ["https://utfs.io/f/file-key", "https://utfs.io/f/preview-key"],
      expect.any(String),
    );
    expect(result).toEqual({ success: true });
  });

  it("does not touch storage when the resume is not the caller's", async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);
    prismaMock.resume.deleteMany.mockResolvedValue({ count: 0 });

    const caller = createCaller({});

    await expect(
      caller.deleteResume({ resumeId: "resume_1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(deleteUploadThingFilesByUrlMock).not.toHaveBeenCalled();
  });

  describe("rename", () => {
    it("renames only the display name, scoped to the caller", async () => {
      prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

      const caller = createCaller({});
      const result = await caller.rename({
        resumeId: "resume_1",
        resumeName: "Backend Engineer 2026",
      });

      expect(prismaMock.resume.updateMany).toHaveBeenCalledWith({
        where: { id: "resume_1", userId: session.user.id },
        data: { resumeName: "Backend Engineer 2026" },
      });
      expect(result).toEqual({
        success: true,
        resumeName: "Backend Engineer 2026",
      });
    });

    it("never writes the file name or storage links", async () => {
      prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

      const caller = createCaller({});
      await caller.rename({ resumeId: "resume_1", resumeName: "New name" });

      const { data } = prismaMock.resume.updateMany.mock.calls[0][0];
      expect(Object.keys(data)).toEqual(["resumeName"]);
      expect(data).not.toHaveProperty("fileName");
      expect(data).not.toHaveProperty("resumeLink");
      expect(data).not.toHaveProperty("resumePreviewLink");
    });

    it("trims surrounding whitespace before saving", async () => {
      prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

      const caller = createCaller({});
      await caller.rename({
        resumeId: "resume_1",
        resumeName: "   Padded name   ",
      });

      expect(prismaMock.resume.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { resumeName: "Padded name" } }),
      );
    });

    it.each([
      ["an empty string", ""],
      ["a whitespace-only string", "   "],
      ["a tab and newline only", "\t\n"],
    ])("rejects %s without hitting the database", async (_label, name) => {
      const caller = createCaller({});

      await expect(
        caller.rename({ resumeId: "resume_1", resumeName: name }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(prismaMock.resume.updateMany).not.toHaveBeenCalled();
    });

    it("rejects a name longer than the allowed maximum", async () => {
      const caller = createCaller({});

      await expect(
        caller.rename({
          resumeId: "resume_1",
          resumeName: "a".repeat(121),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(prismaMock.resume.updateMany).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND when renaming a resume owned by someone else", async () => {
      // The row exists, but not for this user — updateMany matches nothing.
      prismaMock.resume.updateMany.mockResolvedValue({ count: 0 });

      const caller = createCaller({});

      await expect(
        caller.rename({
          resumeId: "someone_elses_resume",
          resumeName: "Hijacked",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(prismaMock.resume.updateMany).toHaveBeenCalledWith({
        where: {
          id: "someone_elses_resume",
          userId: session.user.id,
        },
        data: { resumeName: "Hijacked" },
      });
    });
  });
});
