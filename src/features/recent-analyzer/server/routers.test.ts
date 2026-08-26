import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/trpc/init";
import { jobApplicationRouter } from "@/features/recent-analyzer/server/routers";

const prismaMock = vi.hoisted(() => ({
  jobApplication: {
    count: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    deleteMany: vi.fn(),
  },
  trackerPosition: {
    deleteMany: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  api: {
    getSession: vi.fn(),
  },
}));

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

const createCaller = createCallerFactory(jobApplicationRouter);
const session = { user: { id: "user_123" } };

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
  authMock.api.getSession.mockResolvedValue(session);
});

describe("jobApplicationRouter.deleteJobApplication", () => {
  it("deletes the analysis scoped to the caller", async () => {
    prismaMock.jobApplication.deleteMany.mockResolvedValue({ count: 1 });

    const caller = createCaller({});
    const result = await caller.deleteJobApplication({
      applicationId: "application_1",
    });

    expect(prismaMock.jobApplication.deleteMany).toHaveBeenCalledWith({
      where: { id: "application_1", userId: session.user.id },
    });
    expect(result).toEqual({ success: true });
  });

  it("returns NOT_FOUND when deleting an analysis owned by someone else", async () => {
    // The row exists, but not for this user — deleteMany matches nothing, so
    // ownership failure is indistinguishable from a missing row.
    prismaMock.jobApplication.deleteMany.mockResolvedValue({ count: 0 });

    const caller = createCaller({});

    await expect(
      caller.deleteJobApplication({ applicationId: "someone_elses_analysis" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(prismaMock.jobApplication.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "someone_elses_analysis",
        userId: session.user.id,
      },
    });
  });

  it("leaves the tracker board untouched when an analysis is deleted", async () => {
    // TrackerPosition has no foreign key back to JobApplication, so a kanban
    // card can only be reached by guessing at company + position. Deleting an
    // analysis must never write to that table — a wrong guess would destroy a
    // position the user is actively tracking.
    prismaMock.jobApplication.deleteMany.mockResolvedValue({ count: 1 });

    const caller = createCaller({});
    await caller.deleteJobApplication({ applicationId: "application_1" });

    expect(prismaMock.trackerPosition.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.trackerPosition.delete).not.toHaveBeenCalled();
    expect(prismaMock.trackerPosition.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.trackerPosition.update).not.toHaveBeenCalled();
  });
});
