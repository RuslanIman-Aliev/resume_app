import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/trpc/init";
import { trackerRouter } from "@/features/tracker/server/routers";
import type { TrackerFormValues } from "@/lib/types";

const prismaMock = vi.hoisted(() => ({
  trackerPosition: {
    create: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  jobApplication: {
    count: vi.fn(),
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

const createCaller = createCallerFactory(trackerRouter);
const session = { user: { id: "user_123" } };

const baseInput: TrackerFormValues = {
  company: "Stripe",
  position: "Senior Frontend Engineer",
  location: "Remote",
  salary: "$150k - $180k",
  status: "applied",
  url: "https://stripe.com/jobs/1",
  notes: "Referred by a friend",
  contactName: "Jordan",
  contactEmail: "jordan@stripe.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
  authMock.api.getSession.mockResolvedValue(session);
});

describe("trackerRouter", () => {
  it("creates an application scoped to the current user", async () => {
    const created = { id: "app_1" };
    prismaMock.trackerPosition.create.mockResolvedValue(created);

    const caller = createCaller({});
    const result = await caller.create(baseInput);

    expect(prismaMock.trackerPosition.create).toHaveBeenCalledWith({
      data: {
        userId: session.user.id,
        company: baseInput.company,
        position: baseInput.position,
        location: baseInput.location,
        salary: baseInput.salary,
        status: baseInput.status,
        url: baseInput.url,
        notes: baseInput.notes,
        contactName: baseInput.contactName,
        contactEmail: baseInput.contactEmail,
      },
    });
    expect(result).toEqual(created);
  });

  it("lists only the current user's applications, newest first", async () => {
    const applications = [{ id: "app_1" }, { id: "app_2" }];
    prismaMock.trackerPosition.findMany.mockResolvedValue(applications);

    const caller = createCaller({});
    const result = await caller.getAll();

    expect(prismaMock.trackerPosition.findMany).toHaveBeenCalledWith({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual(applications);
  });

  it("updates an application constrained by id and ownership", async () => {
    const updated = { id: "app_1", company: "Figma" };
    prismaMock.trackerPosition.update.mockResolvedValue(updated);

    const caller = createCaller({});
    const result = await caller.update({ id: "app_1", ...baseInput });

    expect(prismaMock.trackerPosition.update).toHaveBeenCalledWith({
      where: { id: "app_1", userId: session.user.id },
      data: {
        company: baseInput.company,
        position: baseInput.position,
        location: baseInput.location,
        salary: baseInput.salary,
        status: baseInput.status,
        url: baseInput.url,
        notes: baseInput.notes,
        contactName: baseInput.contactName,
        contactEmail: baseInput.contactEmail,
      },
    });
    expect(result).toEqual(updated);
  });

  it("updates status constrained by id and ownership", async () => {
    prismaMock.trackerPosition.update.mockResolvedValue({ id: "app_1" });

    const caller = createCaller({});
    await caller.updateStatus({ id: "app_1", status: "offer" });

    expect(prismaMock.trackerPosition.update).toHaveBeenCalledWith({
      where: { id: "app_1", userId: session.user.id },
      data: { status: "offer" },
    });
  });

  it("deletes an application constrained by id and ownership", async () => {
    prismaMock.trackerPosition.delete.mockResolvedValue({ id: "app_1" });

    const caller = createCaller({});
    const result = await caller.delete({ id: "app_1" });

    expect(prismaMock.trackerPosition.delete).toHaveBeenCalledWith({
      where: { id: "app_1", userId: session.user.id },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated callers", async () => {
    authMock.api.getSession.mockResolvedValue(null);

    const caller = createCaller({});

    await expect(caller.getAll()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(prismaMock.trackerPosition.findMany).not.toHaveBeenCalled();
  });

  it("zero-fills pipeline stats for statuses with no tracked positions", async () => {
    prismaMock.trackerPosition.groupBy.mockResolvedValue([
      { status: "applied", _count: { _all: 3 } },
      { status: "offer", _count: { _all: 1 } },
    ]);

    const caller = createCaller({});
    const result = await caller.getPipelineStats();

    expect(prismaMock.trackerPosition.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { _all: true },
    });
    expect(result).toEqual({
      counts: {
        saved: 0,
        applied: 3,
        screening: 0,
        interview: 0,
        offer: 1,
        rejected: 0,
      },
      total: 4,
    });
  });

  it("derives every headline counter from a single status groupBy", async () => {
    prismaMock.trackerPosition.groupBy.mockResolvedValue([
      { status: "saved", _count: { _all: 5 } },
      { status: "applied", _count: { _all: 3 } },
      { status: "screening", _count: { _all: 2 } },
      { status: "interview", _count: { _all: 4 } },
      { status: "offer", _count: { _all: 1 } },
      { status: "rejected", _count: { _all: 6 } },
    ]);
    prismaMock.jobApplication.count.mockResolvedValue(9);

    const caller = createCaller({});
    const result = await caller.getStatistics();

    expect(result).toEqual({
      analyzed: 9,
      // Everything except the 5 bookmarked-but-never-sent positions.
      applied: 16,
      interviews: 4,
      offers: 1,
    });
    expect(prismaMock.trackerPosition.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { _all: true },
    });
  });

  it("reports zeroed statistics for a user with no tracked positions", async () => {
    prismaMock.trackerPosition.groupBy.mockResolvedValue([]);
    prismaMock.jobApplication.count.mockResolvedValue(0);

    const caller = createCaller({});

    await expect(caller.getStatistics()).resolves.toEqual({
      analyzed: 0,
      applied: 0,
      interviews: 0,
      offers: 0,
    });
  });

  it("lists only the current user's positions in a live conversation stage", async () => {
    const positions = [{ id: "app_1", status: "interview" }];
    prismaMock.trackerPosition.findMany.mockResolvedValue(positions);

    const caller = createCaller({});
    const result = await caller.getInterviewStagePositions();

    expect(prismaMock.trackerPosition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: session.user.id,
          status: { in: ["screening", "interview"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }),
    );
    expect(result).toEqual(positions);
  });
});
