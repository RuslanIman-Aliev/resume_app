import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/trpc/init";
import { resumeRouter } from "@/features/resumes/server/routers";

const prismaMock = vi.hoisted(() => ({
  resume: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  resumeAnalysis: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  jobApplication: {
    create: vi.fn(),
    findFirst: vi.fn(),
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

const createCaller = createCallerFactory(resumeRouter);
const session = { user: { id: "user_123" } };

beforeEach(() => {
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
        parsedContent: input.parsedContent,
      },
    });
    expect(result).toEqual({ resume });
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

  it("throws when triggering analysis for missing resume", async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(
      caller.triggerAnalysis({ resumeId: "resume_404" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
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
    prismaMock.jobApplication.create.mockResolvedValue({
      id: "application_1",
      resume: { parsedContent: "  " },
    });

    const caller = createCaller({});

    await expect(
      caller.triggerJobMatchAnalysis({
        resumeId: "resume_1",
        jobDescription: "Job description",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("triggers job match analysis when parsed content exists", async () => {
    prismaMock.jobApplication.create.mockResolvedValue({
      id: "application_2",
      resume: { parsedContent: "Parsed content" },
    });
    inngestMock.send.mockResolvedValue({});

    const caller = createCaller({});
    const result = await caller.triggerJobMatchAnalysis({
      resumeId: "resume_1",
      jobDescription: "Job description",
    });

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "app/job-matched.analyzed",
      data: {
        applicationId: "application_2",
        resumeId: "resume_1",
        jobDescription: "Job description",
        parsedContent: "Parsed content",
      },
    });
    expect(result).toEqual({ applicationId: "application_2" });
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

    expect(result).toEqual({ application });
  });
});
