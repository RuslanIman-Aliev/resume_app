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
import type { ApplicationData } from "@/lib/types";
import AnalyzeResumeImprovements from "./analyze-resume-improvements";

const {
  mockMutateAsync,
  mockInvalidateQueries,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

let queryState: {
  data?: { resume: { parsedContent: string } };
  isLoading: boolean;
};

const mockEditor = {
  state: {
    doc: {
      descendants: (
        callback: (
          node: { isText: boolean; text?: string },
          pos: number,
        ) => boolean,
      ) => {
        callback({ isText: false }, 0);
      },
    },
    schema: {
      marks: {
        suggestionMark: {
          create: vi.fn(() => ({ type: "suggestionMark" })),
        },
      },
    },
    tr: {
      insertText: vi.fn(() => ({
        addMark: vi.fn(() => ({})),
      })),
      removeMark: vi.fn(() => ({})),
    },
  },
  view: {
    dispatch: vi.fn(),
  },
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      insertContent: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
  })),
  commands: {
    setContent: vi.fn(),
  },
};

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    resume: {
      applyImprovement: {
        mutationOptions: () => ({}),
      },
      getParsedContent: {
        queryOptions: () => ({}),
        queryKey: () => ["resume.getParsedContent"],
      },
      getJobMatchResult: {
        queryKey: (input: { applicationId?: string }) => [
          "resume.getJobMatchResult",
          input,
        ],
      },
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useQuery: () => queryState,
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: () => mockEditor,
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const createImprovement = () => ({
  title: "Strengthen summary",
  priority: "high",
  afterText: "New summary",
  beforeText: "Old summary",
  description: "Make the summary more specific",
  suggestions: ["Use measurable impact"],
  matchScoreBoost: 8,
  targetSection: "summary" as const,
});

type TestApplicationData = {
  improvements: ReturnType<typeof createImprovement>[];
  matchScore: number;
  summary: { estimatedScoreWithAllImprovements: number } | null;
};

const createData = (
  overrides?: Partial<TestApplicationData>,
): ApplicationData => {
  return {
    improvements: [createImprovement()],
    matchScore: 55,
    summary: { estimatedScoreWithAllImprovements: 78 },
    ...overrides,
  } as unknown as ApplicationData;
};

describe("AnalyzeResumeImprovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState = {
      data: { resume: { parsedContent: "Resume content" } },
      isLoading: false,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty card when there are no improvements", () => {
    render(
      <AnalyzeResumeImprovements
        data={createData({ improvements: [] })}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    expect(screen.getByText("No Improvements Found")).toBeInTheDocument();
  });

  it("shows current and improved score when summary estimate exists", () => {
    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    expect(screen.getByText("55%", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("78%", { exact: false })).toBeInTheDocument();
  });

  it("shows styled editor loading state while parsed resume is loading", () => {
    queryState = { isLoading: true };

    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /strengthen summary/i })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /apply to resume/i }));

    expect(screen.getByTestId("resume-editor-loading")).toBeInTheDocument();
  });

  it("adds and cancels a pending suggestion", async () => {
    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /strengthen summary/i })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /apply to resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending suggestions: 1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.queryByText(/pending suggestions:/i),
      ).not.toBeInTheDocument();
    });
  });

  it("applies a pending suggestion and saves it", async () => {
    mockMutateAsync.mockResolvedValue({ success: true });

    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /strengthen summary/i })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /apply to resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending suggestions: 1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        resumeId: "resume_1",
        applicationId: "app_1",
        targetSection: "summary",
        targetId: undefined,
        previousText: "Old summary",
        newText: "New summary",
      });
    });

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it("shows toast error when apply mutation fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Mutation failed"));

    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /strengthen summary/i })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /apply to resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending suggestions: 1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Mutation failed");
    });
  });

  it("disables apply and cancel while pending action is in progress", async () => {
    let resolveMutation: (() => void) | undefined;
    const pendingMutation = new Promise<void>((resolve) => {
      resolveMutation = resolve;
    });
    mockMutateAsync.mockReturnValue(pendingMutation);

    render(
      <AnalyzeResumeImprovements
        data={createData()}
        resumeId="resume_1"
        applicationId="app_1"
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: /strengthen summary/i })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /apply to resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending suggestions: 1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    resolveMutation?.();
  });
});
