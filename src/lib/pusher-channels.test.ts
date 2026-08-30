import {
  jobMatchChannel,
  parseAnalysisChannel,
  resumeAnalysisChannel,
} from "@/lib/pusher-channels";
import { describe, expect, it } from "vitest";

describe("analysis channels", () => {
  it("names a private channel per resource", () => {
    // The `private-` prefix is what makes Pusher call the auth endpoint at
    // all; without it any holder of the public key can subscribe.
    expect(resumeAnalysisChannel("resume_1")).toBe("private-resume-resume_1");
    expect(jobMatchChannel("app_1")).toBe("private-job-match-app_1");
  });

  it("reads a channel back into the resource to authorize", () => {
    expect(parseAnalysisChannel(resumeAnalysisChannel("resume_1"))).toEqual({
      kind: "resume",
      resumeId: "resume_1",
    });
    expect(parseAnalysisChannel(jobMatchChannel("app_1"))).toEqual({
      kind: "jobMatch",
      applicationId: "app_1",
    });
  });

  it("refuses channels this app does not publish on", () => {
    // The auth endpoint signs nothing it cannot resolve to an owned row, so
    // the old public names and any invented channel have to come back null.
    expect(parseAnalysisChannel("resume-updates")).toBeNull();
    expect(parseAnalysisChannel("job-match")).toBeNull();
    expect(parseAnalysisChannel("private-resume-")).toBeNull();
    expect(parseAnalysisChannel("presence-resume-resume_1")).toBeNull();
    expect(parseAnalysisChannel("private-something-else")).toBeNull();
  });
});
