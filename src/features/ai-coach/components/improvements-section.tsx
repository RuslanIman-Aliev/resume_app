"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackState } from "@/components/ui/feedback-state";
import { getErrorFeedback } from "@/lib/error-feedback";
import { getCategoryConfig, getPriorityConfig } from "@/lib/ui-config";
import { findUnverifiedNumbers } from "@/lib/unverified-numbers";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImprovementsError, ImprovementsSkeleton } from "./improvements-status";

const ImprovementsSection = () => {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams();
  const resumeId = params.id as string;

  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    trpc.resume.getImprovements.queryOptions({ resumeId }),
  );

  const { mutate: applyImprovement } = useMutation(
    trpc.resume.applyImprovement.mutationOptions({
      onSuccess: () => {
        // The edit lands in the resume's structured content, not in the DOCX
        // file — that rewrite only happens in the analyzer, where the document
        // editor is mounted. Say so rather than implying the file changed.
        toast.success("Suggestion applied to your resume content.");
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getImprovements.queryKey({ resumeId }),
        });
      },
      onError: (error) => {
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to apply this suggestion.",
          }).message,
        );
      },
      onSettled: () => setApplyingKey(null),
    }),
  );

  const filteredImprovements = useMemo(() => {
    const improvements = data?.improvements ?? [];
    if (filter === "all") {
      return improvements;
    }
    // impact is e.g. "High Impact" -> normalize to its first word ("high").
    return improvements.filter(
      (improvement) => improvement.impact.toLowerCase().split(" ")[0] === filter,
    );
  }, [data?.improvements, filter]);

  // Separates "the filter matched nothing" from "the analysis produced
  // nothing" - the two need different copy and only the first has a way out.
  const hasAnyImprovements = (data?.improvements ?? []).length > 0;

  if (isLoading) {
    return <ImprovementsSkeleton />;
  }

  if (isError) {
    return <ImprovementsError onRetry={refetch} isRetrying={isFetching} />;
  }
  return (
    <section>
      <div className="flex flex-col gap-4 items-start justify-between sm:flex-row sm:items-center sm:gap-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">Improvement Suggestions</h2>
          <p className="text-muted-foreground">
            {filteredImprovements.length === 1
              ? "1 suggestion to improve your resume"
              : `${filteredImprovements.length} suggestions to improve your resume`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {["all", "high", "medium", "low"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f as typeof filter)}
              className="capitalize hover:bg-primary! min-h-11 sm:min-h-0"
            >
              {f === "all" ? "All" : `${f} Impact`}
            </Button>
          ))}
        </div>
      </div>
      <div>
        {filteredImprovements.length === 0 ? (
          // Without this the section rendered "0 suggestions" over an empty
          // accordion, which reads as a broken screen rather than a filter that
          // matched nothing.
          <FeedbackState
            layout="inline"
            className="mt-4 rounded-2xl border border-border/50 bg-card/50"
            icon={<Lightbulb className="h-8 w-8 text-primary/50" />}
            title={
              hasAnyImprovements
                ? `No ${filter} impact suggestions`
                : "No suggestions in this analysis"
            }
            description={
              hasAnyImprovements
                ? "The analysis found suggestions, just none at this impact level."
                : "The model returned no improvements for this resume. Re-run the analysis after editing it to get a fresh set."
            }
            primaryAction={
              hasAnyImprovements
                ? {
                    label: "Show all suggestions",
                    onClick: () => setFilter("all"),
                    variant: "secondary",
                  }
                : undefined
            }
          />
        ) : null}
        <Accordion type="multiple" className="mt-4 space-y-6">
          {filteredImprovements.map((improvement, index) => {
            const category = getCategoryConfig(improvement.category);
            const priority = getPriorityConfig(improvement.impact);
            const accordionItemValue = `${improvement.description}-${index}`;

            const CategoryIcon = category.icon;

            return (
              <AccordionItem
                key={accordionItemValue}
                value={accordionItemValue}
                className="rounded-2xl border border-border/50 bg-card/50"
              >
                <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                  <div className="flex items-start gap-5 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 ">
                      <div className="flex flex-row flex-wrap gap-2">
                        <Badge variant="outline" className={category.color}>
                          {category.label}
                        </Badge>
                        <Badge variant="outline" className={priority.color}>
                          {priority.label}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold">
                        {improvement.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {improvement.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ">
                  <div className="px-5 pt-0 pb-4 border-t border-border/30">
                    <div className="my-3 grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">
                            Current
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {improvement.currentText}
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              Suggested
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{improvement.suggestedText}</p>

                        {/* The model is told never to invent a figure, but it
                            can still volunteer one. Applying a suggestion
                            writes it into the resume the user downloads, so
                            any new digits are named here, beside the text,
                            while there is still a decision to make. */}
                        {(() => {
                          const unverified = findUnverifiedNumbers(
                            improvement.currentText,
                            improvement.suggestedText,
                          );

                          if (unverified.length === 0) {
                            return null;
                          }

                          return (
                            <p className="mt-3 flex items-start gap-2 border-t border-primary/20 pt-3 text-xs text-muted-foreground">
                              <AlertCircle
                                aria-hidden="true"
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                              />
                              <span>
                                This suggestion adds{" "}
                                {unverified.length === 1
                                  ? "a number that is"
                                  : "numbers that are"}{" "}
                                not in your resume. Check it against what you
                                actually did before applying.
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    {improvement.metricPrompt?.trim() ? (
                      <div className="rounded-lg border border-border/50 bg-muted/40 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-medium">
                          <HelpCircle
                            aria-hidden="true"
                            className="h-4 w-4 text-primary"
                          />
                          Worth adding, if you know it
                        </h4>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {improvement.metricPrompt}
                        </p>
                      </div>
                    ) : null}

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        Tips
                      </h4>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {improvement.tips.map((tip: string, index: number) => (
                          <li className="flex gap-2" key={`${tip}-${index}`}>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/30">
                      {improvement.isApplied ? (
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                          Applied to your resume
                        </div>
                      ) : (
                        <Button
                          className="min-h-11 w-full sm:min-h-0 sm:w-auto"
                          // A suggestion with no replacement text has nothing to
                          // write back, so there is no action to offer.
                          disabled={
                            !improvement.suggestedText?.trim() ||
                            applyingKey !== null
                          }
                          onClick={() => {
                            setApplyingKey(accordionItemValue);
                            applyImprovement({
                              resumeId,
                              targetSection: improvement.targetSection,
                              targetId: improvement.targetId,
                              previousText: improvement.currentText ?? undefined,
                              newText: improvement.suggestedText ?? "",
                            });
                          }}
                        >
                          {applyingKey === accordionItemValue ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              Apply This Suggestion
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};

export default ImprovementsSection;
