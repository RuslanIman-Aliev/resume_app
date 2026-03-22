import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Sparkles, Lightbulb } from "lucide-react";

const AnalyzerSuggestions = () => {
  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur py-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ATS Keywords
          </CardTitle>
          <CardDescription>
            Important keywords to include in your resume for better ATS matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* {data.keywords.map((keyword, i) => ( */}
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground border-border/50 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
              Frontend
            </Badge>
            {/*))}*/}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="border-primary/30 bg-linear-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Suggestions
          </CardTitle>
          <CardDescription>
            Personalized recommendations to improve your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {/* {data.suggestions.map((suggestion, i) => ( */}
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                1
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">
                Highlight your React and TypeScript projects prominently
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                2
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">
                Include specific metrics and achievements for each project
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                3
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">
                Mention experience with testing frameworks like Jest or Cypress
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                4
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">
                {" "}
                Add examples of mentoring or leading junior developers
              </span>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                5
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">
                Include any accessibility (a11y) initiatives you&apos;ve
                contributed to
              </span>
            </li>
            {/* ))} */}
          </ul>
        </CardContent>
      </Card>
    </>
  );
};

export default AnalyzerSuggestions;
