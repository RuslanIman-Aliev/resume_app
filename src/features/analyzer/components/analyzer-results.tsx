import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getScoreColor } from "@/lib/utils";
import { Briefcase, Building2, Target, TrendingUp } from "lucide-react";

const AnalyzerResults = ({
  position,
  company,
  experience,
  salaryRange,
  matchScore,
}: {
  position: string;
  company: string;
  experience: string;
  salaryRange: string;
  matchScore: number;
}) => {
  return (
    <>
      <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-border/50 bg-card/50 backdrop-blur ">
          <CardContent className="py-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-muted-foreground">
                  Position
                </h3>
                <p className="mt-1 text-base text-foreground">{position}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-muted-foreground ">
                  Company
                </h3>
                <p className="mt-1 text-base text-foreground">{company}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur ">
          <CardContent className="py-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-muted-foreground">
                  Experience
                </h3>
                <p className="mt-1 text-base text-foreground">{experience}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur ">
          <CardContent className="py-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-muted-foreground">
                  Salary Range
                </h3>
                <p className="mt-1 text-base text-foreground">{salaryRange}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
