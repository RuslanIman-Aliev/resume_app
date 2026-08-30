/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalyzerTabs from "./analyzer-tabs";

const { mockMutate, mockPush } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockPush: vi.fn(),
}));

let queryState: {
  data?: {
    resumes: Array<{
      id: string;
      resumeName: string;
      postedRole: string;
      status: string;
      createdAt: Date;
      analysis: Array<{ keywords: string[]; overallScore: number }>;
    }>;
  };
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

let mutationState: { isPending: boolean };

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    resume: {
      getResumesAndAnalyses: { queryOptions: () => ({}) },
      triggerJobMatchAnalysis: { mutationOptions: () => ({}) },
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryState,
  useMutation: () => ({
    mutate: mockMutate,
    isPending: mutationState.isPending,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}));

const seedResume = {
  id: "resume-1",
  resumeName: "frontend-cv.pdf",
  postedRole: "Frontend Engineer",
  status: "ANALYZED",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  analysis: [{ keywords: ["React"], overallScore: 72 }],
};

const getAnalyzeButton = () =>
  screen.getByRole("button", { name: /analyze job description/i });

const fillJobDescription = () => {
  fireEvent.change(
    screen.getByPlaceholderText("Paste the job description here..."),
    { target: { value: "React engineer with TypeScript experience." } },
  );
};

beforeEach(() => {
  queryState = {
    data: { resumes: [seedResume] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  mutationState = { isPending: false };
});

afterEach(() => {
  cleanup();
});

describe("AnalyzerTabs", () => {
  it("exposes each resume as a selectable option", () => {
    render(<AnalyzerTabs />);

    // Selecting a resume is the required first step of this page. As a
    // clickable `<div>` it was unreachable by keyboard, which left the analyze
    // button permanently disabled for anyone not using a mouse.
    const option = screen.getByRole("radio", { name: /frontend engineer/i });
    expect(option).toHaveAttribute("aria-checked", "false");

    fireEvent.click(option);

    expect(
      screen.getByRole("radio", { name: /frontend engineer/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("keeps analysis disabled until a resume and a description are given", () => {
    render(<AnalyzerTabs />);

    expect(getAnalyzeButton()).toBeDisabled();

    fillJobDescription();
    expect(getAnalyzeButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /frontend engineer/i }));
    expect(getAnalyzeButton()).toBeEnabled();
  });

  it("triggers one analysis for a double click", () => {
    render(<AnalyzerTabs />);

    fillJobDescription();
    fireEvent.click(screen.getByRole("radio", { name: /frontend engineer/i }));

    const analyzeButton = getAnalyzeButton();
    fireEvent.click(analyzeButton);
    fireEvent.click(analyzeButton);

    // Two calls would mean two job_application rows, two OpenAI runs and two
    // tracker cards; the 5/min rate limit lets both through.
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toEqual({
      resumeId: "resume-1",
      jobDescription: "React engineer with TypeScript experience.",
    });
  });

  it("disables the button while the request is in flight", () => {
    mutationState = { isPending: true };
    render(<AnalyzerTabs />);

    fillJobDescription();
    fireEvent.click(screen.getByRole("radio", { name: /frontend engineer/i }));

    expect(
      screen.getByRole("button", { name: /starting analysis/i }),
    ).toBeDisabled();
  });
});
