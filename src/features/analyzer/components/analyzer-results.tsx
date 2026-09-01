import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getScoreColor } from "@/lib/format";
import { MATCH_SCORE_UNCERTAINTY } from "@/lib/match-score";
import {
  Briefcase,
  Building2,
  Building2Icon,
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
  updatedAt: string;
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
          className="max-h-28 overflow-y-auto pr-1 text-[15px] leading-6 text-foreground/95 scrollbar-thin"
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
  updatedAt,
}: AnalyzerResultsProps) => {
  const overviewItems: ResultCardItem[] = [
    { title: "Position", value: position, icon: Briefcase },
    { title: "Company", value: company, icon: Building2 },
    { title: "Experience", value: experience, icon: TrendingUp },
    { title: "Salary Range", value: salaryRange, icon: CircleDollarSign },
  ];

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Badge
            variant="outline"
            className="border-green-500/30 bg-green-500/10 text-green-500 px-2.5 py-0.5 font-medium"
          >
            Analysis Complete
          </Badge>
          <p className="text-sm text-muted-foreground font-medium">
            Analyzed{" "}
            {new Date(updatedAt).toLocaleDateString(undefined, {
              dateStyle: "short",
            })}
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-foreground">
          {position}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Building2Icon className="h-4 w-4 shrink-0" />
            {company}
          </div>
          {/* Можно добавить резюме, если будет проп: */}
          {/* <div className="flex items-center gap-1.5 text-sm font-medium">
            <FileTextIcon className="h-4 w-4 shrink-0" />
            Software Engineer Resume
          </div> */}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewItems.map((item) => (
          <InfoCard key={item.title} {...item} />
        ))}
      </div>

      <Card className="border-primary/30 bg-linear-to-r from-primary/5 to-transparent mt-5">
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
                  {/* The score is one sample from a model, not a measurement.
                      Repeat runs of identical input moved by up to six points,
                      so the band is shown rather than implying the tool can
                      tell 58 from 62. */}
                  <span className="text-sm font-medium text-muted-foreground">
                    &plusmn; {MATCH_SCORE_UNCERTAINTY}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Progress value={matchScore} className="h-3" />
              {/* Was "Based on keyword matching and requirement alignment",
                  which describes a calculation the product does not perform:
                  the score is a number the model returns, not a formula over
                  extracted keywords. */}
              <p className="mt-2 text-sm text-muted-foreground">
                An AI estimate of how well this resume fits the posting. Re-runs
                can move it a few points either way.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AnalyzerResults;
