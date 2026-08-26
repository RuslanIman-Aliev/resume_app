import {
  parseResumeStatusFilter,
  resumeStatusValues,
} from "@/lib/resume-status";
import { describe, expect, it } from "vitest";

describe("parseResumeStatusFilter", () => {
  it("accepts every stored status value", () => {
    for (const status of resumeStatusValues) {
      expect(parseResumeStatusFilter(status)).toBe(status);
    }
  });

  it("upgrades the pre-migration lowercase spelling", () => {
    // Links shared before `resume.status` became an enum carry `?status=draft`.
    // They should keep filtering rather than silently widening to every resume.
    expect(parseResumeStatusFilter("draft")).toBe("DRAFT");
    expect(parseResumeStatusFilter("analyzed")).toBe("ANALYZED");
  });

  it("drops values that are not statuses", () => {
    // `getAll` validates the filter as an enum, so an unrecognised parameter
    // has to become "no filter" here instead of reaching the query and failing.
    expect(parseResumeStatusFilter("archived")).toBeUndefined();
    expect(parseResumeStatusFilter("")).toBeUndefined();
    expect(parseResumeStatusFilter(undefined)).toBeUndefined();
  });
});
