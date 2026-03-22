import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CheckCircle2, CircleDot } from "lucide-react";

const AnalyzerRequirements = () => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur py-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Requirements
        </CardTitle>
        <CardDescription>
          Key qualifications extracted from the job description
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-xs">
              !
            </span>
            Required
          </h4>
          {/* Render later a list of required qualifications */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                5+ years of experience with React and TypeScript
              </span>
            </div>

            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                5+ years of experience with React and TypeScript
              </span>
            </div>

            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                5+ years of experience with React and TypeScript
              </span>
            </div>

            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                5+ years of experience with React and TypeScript
              </span>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-foreground my-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-xs">
              +
            </span>
            Preferred
          </h4>
          {/* Render later a list of preferred qualifications */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Experience with Next.js and server-side rendering
              </span>
            </div>

            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Knowledge of design systems and component libraries
              </span>
            </div>

            <div className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Familiarity with CI/CD pipelines
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyzerRequirements;
