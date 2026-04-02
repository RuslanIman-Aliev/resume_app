"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryConfig, getPriorityConfig } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ImprovementsError, ImprovementsSkeleton } from "./improvements-status";

const ImprovementsSection = () => {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all",
  );
  const trpc = useTRPC();
  const params = useParams();
  const resumeId = params.id as string;

  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    trpc.resume.getImprovements.queryOptions({ resumeId }),
  );

  if (isLoading) {
    return <ImprovementsSkeleton />;
  }

  if (isError) {
    return <ImprovementsError onRetry={refetch} isRetrying={isFetching} />;
  }
  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">Improvement Suggestions</h2>
          <p className="text-muted-foreground">
            {data?.improvements.length} suggestions to improve your resume
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {["all", "high", "medium", "low"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f as typeof filter)}
              className="capitalize hover:bg-primary!"
            >
              {f === "all" ? "All" : `${f} Impact`}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Accordion type="multiple" className="mt-4 space-y-6">
          {data?.improvements.map((improvement, index) => {
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
                    <div className="flex flex-col gap-1 ">
                      <div className="flex flex-row gap-2">
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
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        Tips
                      </h4>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {improvement.tips.map((tip: string, index: number) => (
                          <li className="flex gap-2" key={index}>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/30">
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

export default ImprovementsSection;
