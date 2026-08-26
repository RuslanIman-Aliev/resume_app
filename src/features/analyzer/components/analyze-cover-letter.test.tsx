/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalyzeCoverLetter from "./analyze-cover-letter";

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const COVER_LETTER = [
  "Dear Hiring Manager,",
  "I am excited to apply for the Senior Full Stack Engineer position.",
  "Sincerely,\nJane Doe",
].join("\n\n");

const defaultProps = {
  coverLetterText: COVER_LETTER,
  matchingSkills: [
    { skill: "Next.js", importance: "High" as const },
    { skill: "Vercel", importance: null },
  ],
  missingSkills: [{ skill: "PostgreSQL", impact: "High" as const }],
  companyName: "ElevateHQ",
  jobTitle: "Senior Full Stack Engineer",
};

const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AnalyzeCoverLetter", () => {
  it("renders the letter with its paragraph breaks preserved", () => {
    render(<AnalyzeCoverLetter {...defaultProps} />);

    const letter = screen.getByText(/Dear Hiring Manager,/);

    expect(letter).toHaveTextContent("Sincerely,", {
      normalizeWhitespace: false,
    });
    expect(letter.textContent).toBe(COVER_LETTER);
    expect(letter).toHaveClass("whitespace-pre-wrap");
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download \.txt/i }),
    ).toBeInTheDocument();
  });

  it("renders matching and missing skills as separate groups", () => {
    render(<AnalyzeCoverLetter {...defaultProps} />);

    expect(screen.getByText("Matching Skills (2)")).toBeInTheDocument();
    expect(screen.getByText("Missing Skills (1)")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("skips a skills group that has no items", () => {
    render(
      <AnalyzeCoverLetter
        {...defaultProps}
        matchingSkills={[]}
        missingSkills={[]}
      />,
    );

    expect(screen.queryByText(/Matching Skills/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing Skills/)).not.toBeInTheDocument();
  });

  it("shows an empty state without action buttons when there is no letter", () => {
    render(<AnalyzeCoverLetter {...defaultProps} coverLetterText={null} />);

    expect(screen.getByText("No Cover Letter Yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /copy/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /download \.txt/i }),
    ).not.toBeInTheDocument();
    // Skills stay visible so the tab is never blank.
    expect(screen.getByText("Matching Skills (2)")).toBeInTheDocument();
  });

  it("treats a blank letter as missing", () => {
    render(
      <AnalyzeCoverLetter {...defaultProps} coverLetterText={"   \n  "} />,
    );

    expect(screen.getByText("No Cover Letter Yet")).toBeInTheDocument();
  });

  it("copies the full letter to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<AnalyzeCoverLetter {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(COVER_LETTER));
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Cover letter copied to clipboard.",
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("reports a rejected clipboard write", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new Error("Write permission denied."));
    setClipboard({ writeText });

    render(<AnalyzeCoverLetter {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Write permission denied."),
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("reports an unavailable clipboard API", async () => {
    setClipboard(undefined);

    render(<AnalyzeCoverLetter {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Clipboard access is unavailable in this browser.",
      ),
    );
  });

  it("downloads the letter under a slugified file name", () => {
    const createObjectURL = vi.fn(() => "blob:cover-letter");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<AnalyzeCoverLetter {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /download \.txt/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe(
      "cover-letter-elevatehq-senior-full-stack-engineer.txt",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:cover-letter");
    expect(document.body.contains(anchor)).toBe(false);

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("falls back to a generic file name when no slug can be built", () => {
    const createObjectURL = vi.fn(() => "blob:cover-letter");
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <AnalyzeCoverLetter
        {...defaultProps}
        companyName="ООО Ромашка"
        jobTitle={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /download \.txt/i }));

    const anchor = clickSpy.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("cover-letter.txt");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
