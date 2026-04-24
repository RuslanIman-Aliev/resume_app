"use client";

import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";

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
  const updateBlockMutation = useMutation(
    trpc.resume.applyImprovement.mutationOptions()
  );
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleApplyToResume = async (
    improvement: ImprovementTip,
    index: number,
  ) => {
    const id = `${improvement.targetId}-${index}`;
    setApplyingId(id);

    try {
      await updateBlockMutation.mutateAsync({
        resumeId,
        targetSection: improvement.targetSection,
        targetId: improvement.targetId,
        newText: improvement.afterText,
      });

      // Successfully applied logic here
      // (e.g. invalidating query or showing toast)
    } catch (error) {
      console.error(error);
    } finally {
      setApplyingId(null);
    }
  };

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
                        onClick={() => handleApplyToResume(improvement, index)}
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
      </div>
    </section>
  );
};

export default AnalyzeResumeImprovements;
