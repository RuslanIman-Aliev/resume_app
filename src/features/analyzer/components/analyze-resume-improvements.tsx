"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationData, ImprovementTip } from "@/lib/types";
import { getScoreColor } from "@/lib/utils";
import {
  CheckIcon,
  CircleDot,
  Copy,
  Wand2,
  XIcon,
  Loader2,
} from "lucide-react";
import { EmptyDataCard } from "./empty-data-card";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";

type SuggestionStatus = "pending" | "accepted" | "rejected";

type PendingSuggestion = {
  id: string;
  targetSection: ImprovementTip["targetSection"];
  targetId?: string;
  beforeText: string;
  afterText: string;
  status: SuggestionStatus;
};

type QueuedApply = {
  improvement: ImprovementTip;
  index: number;
};

const suggestionClassByStatus: Record<SuggestionStatus, string> = {
  pending: "bg-green-500/15 ring-1 ring-green-500/40 rounded-sm",
  accepted: "bg-green-500/10 ring-1 ring-green-500/20 rounded-sm",
  rejected: "",
};

const SuggestionMark = Mark.create({
  name: "suggestionMark",

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes) => {
          if (!attributes.suggestionId) {
            return {};
          }

          return { "data-suggestion-id": attributes.suggestionId };
        },
      },
      status: {
        default: "pending",
        parseHTML: (element) =>
          element.getAttribute("data-status") ?? "pending",
        renderHTML: (attributes) => ({
          "data-status": attributes.status ?? "pending",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-suggestion-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const status = (HTMLAttributes.status as SuggestionStatus) ?? "pending";

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: suggestionClassByStatus[status],
      }),
      0,
    ];
  },
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getPriorityStyles = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
    case "critical":
      return "border-red-500/30 text-red-500 bg-red-500/10";
    case "medium":
      return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10";
    default:
      return "border-blue-500/30 text-blue-500 bg-blue-500/10";
  }
};

type TextRange = { from: number; to: number };

const findRangeByTextNode = (
  editor: NonNullable<ReturnType<typeof useEditor>>,
  text: string,
): TextRange | null => {
  const searchValue = text.trim();
  if (!searchValue) {
    return null;
  }

  let found: TextRange | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) {
      return !found;
    }

    const startIndex = node.text.indexOf(searchValue);
    if (startIndex === -1) {
      return true;
    }

    const from = pos + startIndex;
    found = { from, to: from + searchValue.length };
    return false;
  });

  return found;
};

const findSuggestionMarkRange = (
  editor: NonNullable<ReturnType<typeof useEditor>>,
  suggestionId: string,
): TextRange | null => {
  const markType = editor.state.schema.marks.suggestionMark;

  if (!markType) {
    return null;
  }

  let from: number | null = null;
  let to: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return true;
    }

    const hasSuggestionMark = node.marks.some(
      (mark) =>
        mark.type === markType && mark.attrs.suggestionId === suggestionId,
    );

    if (!hasSuggestionMark) {
      return true;
    }

    if (from === null) {
      from = pos;
    }

    to = pos + node.nodeSize;
    return true;
  });

  if (from === null || to === null) {
    return null;
  }

  return { from, to };
};

const AnalyzeResumeImprovements = ({
  data,
  resumeId,
}: {
  data: ApplicationData;
  resumeId: string;
}) => {
  const improvementsList = data.improvements || [];
  const currentScore = data.matchScore;
  const improvedScore = data.summary?.estimatedScoreWithAllImprovements;
  const hasImprovedScore = improvedScore != null;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const applyImprovementMutation = useMutation(
    trpc.resume.applyImprovement.mutationOptions(),
  );
  const [applyingId] = useState<string | null>(null);
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<
    Record<string, PendingSuggestion>
  >({});
  const queuedApplyRef = useRef<QueuedApply | null>(null);

  const { data: parsedResumeData, isLoading: isParsedResumeLoading } = useQuery(
    {
      ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
      enabled: isEditorDialogOpen,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  );

  const parsedResumeText = parsedResumeData?.resume.parsedContent ?? "";

  const editorInitialContent = useMemo(() => {
    const text = parsedResumeText.trim();
    // ИСправить потом для пдф файлов
    if (text.startsWith("<")) {
      return text;
    }
    return text;
    //plainTextToEditorHtml(text);
  }, [parsedResumeText]);
  const editor = useEditor({
    extensions: [StarterKit, SuggestionMark],
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[420px] max-h-[70vh] overflow-y-auto rounded-xl border border-border/60 bg-background px-8 py-6 shadow-sm",
      },
    },
  });

  const applySuggestionToEditor = useCallback(
    (improvement: ImprovementTip, index: number) => {
      if (!editor) {
        return;
      }

      const suggestionId = `${improvement.targetId ?? "summary"}-${index}`;
      const beforeText = (improvement.beforeText || "").trim();
      const afterText = (improvement.afterText || "").trim();

      if (!afterText) {
        return;
      }

      const range = findRangeByTextNode(editor, beforeText);
      const markType = editor.state.schema.marks.suggestionMark;

      if (range) {
        let tr = editor.state.tr.insertText(afterText, range.from, range.to);

        if (markType) {
          tr = tr.addMark(
            range.from,
            range.from + afterText.length,
            markType.create({
              suggestionId,
              status: "pending",
            }),
          );
        }

        editor.view.dispatch(tr);
      } else {
        editor
          .chain()
          .focus()
          .insertContent(
            `<p><span data-suggestion-id="${suggestionId}" data-status="pending">${escapeHtml(afterText)}</span></p>`,
          )
          .run();
      }

      setPendingSuggestions((prev) => ({
        ...prev,
        [suggestionId]: {
          id: suggestionId,
          targetSection: improvement.targetSection,
          targetId: improvement.targetId,
          beforeText,
          afterText,
          status: "pending",
        },
      }));
    },
    [editor],
  );

  useEffect(() => {
    if (!editor || !isEditorDialogOpen || isParsedResumeLoading) {
      return;
    }

    editor.commands.setContent(editorInitialContent);

    const queuedApply = queuedApplyRef.current;
    if (queuedApply) {
      applySuggestionToEditor(queuedApply.improvement, queuedApply.index);
      queuedApplyRef.current = null;
    }
  }, [
    applySuggestionToEditor,
    editor,
    editorInitialContent,
    isEditorDialogOpen,
    isParsedResumeLoading,
  ]);

  const handleClick = (improvement: ImprovementTip, index: number) => {
    setIsEditorDialogOpen(true);

    if (editor && !isParsedResumeLoading && isEditorDialogOpen) {
      applySuggestionToEditor(improvement, index);
      return;
    }

    queuedApplyRef.current = { improvement, index };
  };

  const handleCancelPending = (suggestionId: string) => {
    if (!editor) {
      return;
    }

    const pending = pendingSuggestions[suggestionId];
    if (!pending) {
      return;
    }

    const range = findSuggestionMarkRange(editor, suggestionId);
    if (range) {
      const tr = editor.state.tr.insertText(
        pending.beforeText,
        range.from,
        range.to,
      );
      editor.view.dispatch(tr);
    }

    setPendingSuggestions((prev) => {
      const next = { ...prev };
      delete next[suggestionId];
      return next;
    });
  };

  const handleApplyPending = async (suggestionId: string) => {
    if (!editor) {
      return;
    }

    const pending = pendingSuggestions[suggestionId];
    if (!pending) {
      return;
    }

    setPendingActionId(suggestionId);

    try {
      await applyImprovementMutation.mutateAsync({
        resumeId,
        targetSection: pending.targetSection,
        targetId: pending.targetId,
        previousText: pending.beforeText,
        newText: pending.afterText,
      });

      await queryClient.invalidateQueries({
        queryKey: trpc.resume.getParsedContent.queryKey({ resumeId }),
      });

      const markType = editor.state.schema.marks.suggestionMark;
      const range = findSuggestionMarkRange(editor, suggestionId);

      if (markType && range) {
        const tr = editor.state.tr.removeMark(range.from, range.to, markType);
        editor.view.dispatch(tr);
      }

      setPendingSuggestions((prev) => {
        const next = { ...prev };
        delete next[suggestionId];
        return next;
      });
      toast.success("Suggestion applied and saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to apply suggestion.";
      toast.error(message);
    } finally {
      setPendingActionId(null);
    }
  };

  const pendingItems = Object.values(pendingSuggestions);

  if (improvementsList.length === 0) {
    return (
      <EmptyDataCard
        title="No Improvements Found"
        description="No AI improvements available yet. Run analysis to generate improvement cards."
      />
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-muted-foreground">
            Apply these suggestions to improve your resume match from{" "}
            <span className={`font-bold ${getScoreColor(currentScore || 0)}`}>
              {currentScore}%
            </span>
            {hasImprovedScore ? (
              <>
                {" "}
                to{" "}
                <span
                  className={`font-bold ${getScoreColor(improvedScore || 0)}`}
                >
                  {improvedScore}%
                </span>
              </>
            ) : (
              <>. Estimated improved score is not available yet.</>
            )}
          </p>
        </div>
      </div>
      <div>
        <Accordion type="multiple" className="mt-4 space-y-6">
          {improvementsList.map((improvement, index) => {
            const accordionItemValue = `${improvement.targetId}-${index}`;
            const isApplying = applyingId === accordionItemValue;

            return (
              <AccordionItem
                key={accordionItemValue}
                value={accordionItemValue}
                className="rounded-2xl border border-border/50 bg-card/50"
              >
                <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                  <div className="flex items-start justify-between w-full text-left gap-4 pr-2">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center text-lg font-semibold gap-3">
                        <Badge
                          variant="outline"
                          className={`font-medium px-2 py-0 h-5 lowercase ${getPriorityStyles(
                            improvement.priority,
                          )}`}
                        >
                          {improvement.priority}
                        </Badge>
                        <h2 className="leading-none pt-0.5">
                          {improvement.title}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground mr-6">
                        {improvement.description}
                      </p>
                    </div>
                    {improvement.matchScoreBoost != null && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary shrink-0 mt-0.5"
                      >
                        +{improvement.matchScoreBoost}% match score
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ">
                  <div className="px-5 pt-0 pb-4">
                    <div className="mt-4 mb-4">
                      <h4 className="text-sm font-semibold mb-3">
                        Suggestions:
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {improvement.suggestions.map(
                          (tip: string, index: number) => (
                            <li
                              className="flex items-start gap-2.5"
                              key={index}
                            >
                              <CircleDot className="mt-0.75 h-4 w-4 shrink-0 text-primary" />
                              {tip}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <XIcon className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-500">
                            Before
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {improvement.beforeText}
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-primary">
                            After
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {improvement.afterText}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        className="border-border/60 bg-card/60"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Suggestion
                      </Button>
                      <Button
                        onClick={() => handleClick(improvement, index)}
                        disabled={isApplying}
                      >
                        {isApplying ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        {isApplying ? "Applying..." : "Apply to Resume"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        <Dialog open={isEditorDialogOpen} onOpenChange={setIsEditorDialogOpen}>
          <DialogTitle>Resume Editor</DialogTitle>
          <DialogContent className="w-[95vw]! h-[95vh]! max-h-[95vh]! max-w-[95vw]! mx-auto">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Resume Editor</h3>
              {pendingItems.length > 0 ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    Pending suggestions: {pendingItems.length}
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {pendingItems.map((item) => {
                      const isPendingAction = pendingActionId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs text-muted-foreground">
                              {item.afterText}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelPending(item.id)}
                              disabled={isPendingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplyPending(item.id)}
                              disabled={isPendingAction}
                            >
                              {isPendingAction ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isParsedResumeLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading resume content...
                </p>
              ) : (
                <EditorContent editor={editor} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default AnalyzeResumeImprovements;
