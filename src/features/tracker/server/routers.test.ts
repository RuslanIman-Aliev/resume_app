import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/trpc/init";
import { trackerRouter } from "@/features/tracker/server/routers";
import type { TrackerFormValues } from "@/lib/types";

const prismaMock = vi.hoisted(() => ({
  trackerPosition: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
});
