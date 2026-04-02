import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Zap } from "lucide-react";

const AnalyzerInfo = () => {
  return (
    <div className="space-y-5">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                Extract Key Skills
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Identify both technical and soft skills employers are seeking,
                and understand what truly matters for the role beyond just the
                job title.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                Match Keywords
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Find ATS-friendly keywords and phrases to include in your
                resume, increasing your chances of passing automated screenings
                and getting noticed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="py-3">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                Get Suggestions
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Receive clear, actionable tips to tailor your resume and
                application, helping you stand out and better align with the job
                requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzerInfo;
