import {
  createAppError,
  GENERIC_ERROR_MESSAGE,
  isAppError,
  normalizeAppError,
  toPublicAppError,
} from "@/lib/app-error";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

/**
 * Stand-in for `PrismaClientKnownRequestError`: an `Error` that carries a
 * `code` and a message full of schema detail. Importing the real class would
 * pull the client and its native adapter into a jsdom test for no extra
 * coverage - what matters is the shape.
 */
class FakePrismaError extends Error {
  code: string;
  clientVersion = "6.19.2";
  meta = { cause: "Record to update not found." };

  constructor(message: string, code: string) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
  }
}

const prismaNotFound = () =>
  new FakePrismaError(
    "Invalid `prisma.trackerPosition.update()` invocation: An operation failed because it depends on one or more records that were required but not found.",
    "P2025",
  );

describe("isAppError", () => {
  it("accepts an error this app built", () => {
    expect(isAppError({ code: "NOT_FOUND", message: "No resume here." })).toBe(
      true,
    );
  });

  it("rejects a Prisma error that happens to have a code and a message", () => {
    // The pair `code`/`message` alone used to be enough, which let the driver
    // error through as if the app had written it.
    expect(isAppError(prismaNotFound())).toBe(false);
  });

  it("rejects a thrown TRPCError", () => {
    expect(isAppError(new TRPCError({ code: "NOT_FOUND" }))).toBe(false);
  });

  it("rejects a code outside the tRPC table", () => {
    expect(isAppError({ code: "P2025", message: "Record not found." })).toBe(
      false,
    );
  });
});

describe("toPublicAppError", () => {
  it("keeps the message of an error thrown through createAppError", () => {
    const error = createAppError({
      code: "NOT_FOUND",
      message: "This job is no longer in your tracker.",
    });

    expect(toPublicAppError(error)).toEqual({
      code: "NOT_FOUND",
      message: "This job is no longer in your tracker.",
      details: undefined,
      retryable: false,
    });
  });

  it("keeps the message of a deliberately thrown TRPCError", () => {
    const error = new TRPCError({
      code: "UNAUTHORIZED",
      message: "User is not authenticated",
    });

    expect(toPublicAppError(error)).toMatchObject({
      code: "UNAUTHORIZED",
      message: "User is not authenticated",
      retryable: false,
    });
  });

  it("replaces the message of a wrapped Prisma failure", () => {
    // tRPC copies the cause's message onto the TRPCError, which is how the
    // model name and the failed call used to reach the client verbatim.
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      cause: prismaNotFound(),
    });

    const publicError = toPublicAppError(error);

    expect(publicError.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(publicError.message).not.toContain("prisma");
    expect(publicError).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      retryable: true,
    });
  });

  it("carries no properties beyond the error contract", () => {
    const error = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      cause: prismaNotFound(),
    });

    // A spread of the TRPCError used to hand the client `cause`, and with it
    // the Prisma `meta` and `clientVersion`.
    expect(Object.keys(toPublicAppError(error)).sort()).toEqual([
      "code",
      "message",
      "retryable",
    ]);
  });

  it("falls back to the generic message for a bare throw", () => {
    expect(toPublicAppError("boom")).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: GENERIC_ERROR_MESSAGE,
      retryable: true,
    });
  });
});

describe("normalizeAppError", () => {
  it("reads the AppError the server attached to the response", () => {
    const clientError = {
      message: GENERIC_ERROR_MESSAGE,
      data: {
        code: "NOT_FOUND",
        appError: {
          code: "NOT_FOUND",
          message: "This job is no longer in your tracker.",
        },
      },
    };

    expect(normalizeAppError(clientError)).toEqual({
      code: "NOT_FOUND",
      message: "This job is no longer in your tracker.",
      retryable: false,
    });
  });

  it("does not adopt a foreign error as its own", () => {
    const normalized = normalizeAppError(
      { cause: prismaNotFound() },
      "Could not update the job.",
    );

    expect(normalized).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not update the job.",
      retryable: true,
    });
  });
});
