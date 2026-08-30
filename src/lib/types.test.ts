import {
  TRACKER_FIELD_LIMITS,
  trackerFormSchema,
  type TrackerFormValues,
} from "@/lib/types";
import { describe, expect, it } from "vitest";

const validJob: TrackerFormValues = {
  company: "Acme",
  position: "Backend Engineer",
  location: "Remote",
  salary: "$120k",
  status: "applied",
  url: "https://acme.example/jobs/1",
  notes: "Referred by a friend.",
  contactName: "Alex",
  contactEmail: "alex@acme.example",
};

describe("trackerFormSchema", () => {
  it("accepts a filled-in job", () => {
    expect(trackerFormSchema.safeParse(validJob).success).toBe(true);
  });

  it("rejects text longer than the column is meant to hold", () => {
    // Every field behind these writes to an unbounded Postgres `text` column,
    // so without a limit one authenticated user can store megabytes per job.
    const overLimit: Array<[keyof typeof TRACKER_FIELD_LIMITS, number]> = [
      ["company", TRACKER_FIELD_LIMITS.company],
      ["position", TRACKER_FIELD_LIMITS.position],
      ["location", TRACKER_FIELD_LIMITS.location],
      ["salary", TRACKER_FIELD_LIMITS.salary],
      ["notes", TRACKER_FIELD_LIMITS.notes],
      ["contactName", TRACKER_FIELD_LIMITS.contactName],
    ];

    for (const [field, limit] of overLimit) {
      const result = trackerFormSchema.safeParse({
        ...validJob,
        [field]: "x".repeat(limit + 1),
      });

      expect(result.success, `${field} should be capped at ${limit}`).toBe(
        false,
      );
    }
  });

  it("accepts text right at the limit", () => {
    const result = trackerFormSchema.safeParse({
      ...validJob,
      notes: "x".repeat(TRACKER_FIELD_LIMITS.notes),
    });

    expect(result.success).toBe(true);
  });

  it("still rejects a javascript: link", () => {
    // The length cap sits in front of the protocol check; neither replaces
    // the other.
    const result = trackerFormSchema.safeParse({
      ...validJob,
      url: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });

  it("keeps the empty string as the way to say 'no link'", () => {
    expect(
      trackerFormSchema.safeParse({ ...validJob, url: "", contactEmail: "" })
        .success,
    ).toBe(true);
  });
});
