import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getScoreColor } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  CircleDollarSign,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type AnalyzerResultsProps = {
  position: string;
  company: string;
  experience: string;
  salaryRange: string;
  matchScore: number;
};

type ResultCardItem = {
  title: string;
  value: string;
  icon: LucideIcon;
};

const InfoCard = ({ title, value, icon: Icon }: ResultCardItem) => {
  const normalizedValue = value?.trim() || "Not specified";

  return (
    <Card className="h-full border-border/60 bg-card/60 backdrop-blur-sm">
      <CardContent className="flex h-full flex-col gap-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-5 w-5" />
          </div>
          <Badge
            variant="outline"
            className="border-border/70 bg-background/40 px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            {title}
          </Badge>
        </div>

        <p
          title={normalizedValue}
          className="max-h-28 overflow-y-auto pr-1 text-[15px] leading-6 text-foreground/95 [scrollbar-width:thin]"
        >
          {normalizedValue}
        </p>
      </CardContent>
    </Card>
  );
};

const AnalyzerResults = ({
  position,
  company,
  experience,
  salaryRange,
  matchScore,
}: AnalyzerResultsProps) => {
  const overviewItems: ResultCardItem[] = [
    { title: "Position", value: position, icon: Briefcase },
    { title: "Company", value: company, icon: Building2 },
    { title: "Experience", value: experience, icon: TrendingUp },
    { title: "Salary Range", value: salaryRange, icon: CircleDollarSign },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewItems.map((item) => (
          <InfoCard key={item.title} {...item} />
        ))}
      </div>

      <Card className="border-primary/30 bg-linear-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Resume Match Score
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${getScoreColor(matchScore)} `}
                  >
                    {matchScore}%
                  </span>
                  <span
                    className={`text-sm font-medium ${getScoreColor(matchScore)}`}
                  >
                    Match Score
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Progress value={matchScore} className="h-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                Based on keyword matching and requirement alignment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AnalyzerResults;
