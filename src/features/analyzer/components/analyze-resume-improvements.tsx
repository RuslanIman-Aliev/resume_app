"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationData } from "@/lib/types";
import { getPriorityConfig, getScoreColor } from "@/lib/utils";
import { ArrowRight, CheckIcon, Lightbulb, XIcon } from "lucide-react";

const AnalyzeResumeImprovements = ({ data }: { data: ApplicationData }) => {
  const improvementsList = data.improvements || [];
  const currentScore = data.matchScore;
  const improvedScore = data.summary?.estimatedScoreWithAllImprovements;
  const hasImprovedScore = improvedScore != null;

  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-muted-foreground">
            Apply these suggestions to improve your resume match from{" "}
            <span
              className={`font-bold ${getScoreColor(currentScore || 0)}`}
            >
              {currentScore}%
            </span>
            {hasImprovedScore ? (
              <>
                {" "}to{" "}
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
          {improvementsList.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No AI improvements available yet. Run analysis to generate
              improvement cards.
            </p>
          )}
          {improvementsList.map((improvement, index) => {
            const accordionItemValue = `${improvement.description}-${index}`;
            const bgBageColor = getPriorityConfig(improvement.priority)?.color || "bg-gray-500";
            return (
              <AccordionItem
                key={accordionItemValue}
                value={accordionItemValue}
                className="rounded-2xl border border-border/50 bg-card/50"
              >
                <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                  <div className="flex items-start gap-5 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ">
                      <Badge className={`text-muted-foreground ${bgBageColor}`}>
                        {improvement.priority}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 ">
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
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        Tips
                      </h4>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {improvement.suggestions.map(
                          (tip: string, index: number) => (
                            <li className="flex gap-2" key={index}>
                              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              {tip}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="my-3 grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <XIcon className="h-4 w-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">
                            Before
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {improvement.beforeText}
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              After
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{improvement.afterText}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/30 text-end">
                      <Button>
                        Apply This Suggestion
                        <ArrowRight className="h-4 w-4 ml-2" />
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
