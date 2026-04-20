import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequirementItem, RequirementsMatchData } from "@/lib/types";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Star,
  X,
} from "lucide-react";
import { EmptyDataCard } from "./empty-data-card";

type AnalyzeRequirementsMatchProps = {
  data: RequirementsMatchData;
  improvementsCount: number;
  potentialScore: number;
  onViewImprovements: () => void;
};

const RequirementRow = ({ item }: { item: RequirementItem }) => (
  <div className="flex items-start gap-3 py-1.5">
    {item.matched ? (
      <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-1" />
    ) : (
      <X className="h-4 w-4 shrink-0 text-red-500 mt-1" />
    )}
    <span
      className={`text-[16px] leading-relaxed ${
        item.matched ? "text-muted-foreground" : "text-foreground font-medium"
      }`}
    >
      {item.requirement}
    </span>
  </div>
);

const AnalyzeRequirementsMatch = ({
  data,
  improvementsCount,
  potentialScore,
  onViewImprovements,
}: AnalyzeRequirementsMatchProps) => {
  const isDataEmpty = data.required.length === 0 && data.preferred.length === 0;

  if (isDataEmpty) {
    return (
      <EmptyDataCard
        title="No Requirements Found"
        description="We couldn't extract any specific requirements to analyze against your resume."
      />
    );
  }

  const requiredMatched = data.required.filter((r) => r.matched).length;
  const requireAllMatched = requiredMatched === data.required.length;

  return (
    <div className="flex flex-col gap-4 w-full">
      <Card className="border-border/60 bg-card/60">
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Requirements Match
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {!requireAllMatched && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <h3 className="text-[17px] font-semibold text-foreground">
                  Required ({requiredMatched}/{data.required.length} matched)
                </h3>
              </div>
              <div className="flex flex-col gap-1 pl-1">
                {data.required.map((req, i) => (
                  <RequirementRow key={i} item={req} />
                ))}
              </div>
            </div>

            {data.preferred.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-[17px] font-semibold text-foreground">
                    Preferred
                  </h3>
                </div>
                <div className="flex flex-col gap-1 pl-1">
                  {data.preferred.map((req, i) => (
                    <RequirementRow key={i} item={req} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {improvementsCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-2 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-foreground">
                    {improvementsCount} improvements can boost your score to{" "}
                    {potentialScore}%
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Follow our AI suggestions to maximize your chances
                  </p>
                </div>
              </div>
              <Button
                onClick={onViewImprovements}
                className="shrink-0 bg-primary! text-primary-foreground! hover:bg-primary/90! self-start sm:self-auto ml-16 sm:ml-0"
              >
                View Improvements
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyzeRequirementsMatch;
