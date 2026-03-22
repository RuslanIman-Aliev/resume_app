import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnalyzerRequirements from "@/features/analyzer/components/analyzer-requirements";
import AnalyzerResults from "@/features/analyzer/components/analyzer-results";
import AnalyzerSkills from "@/features/analyzer/components/analyzer-skills";
import AnalyzerSuggestions from "@/features/analyzer/components/analyzer-suggestions";

import { Sparkles } from "lucide-react";
import Link from "next/link";

const AnalyzeResume = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto gap-4 ">
      <Button
        variant={"ghost"}
        asChild
        className="hover:bg-primary! hover:text-black"
      >
        <Link href="/analyzer" className="text-sm font-medium">
          &larr; Back to Analyzer
        </Link>
      </Button>

      <AnalyzerResults />

      <div className="grid lg:grid-cols-2 gap-6">
        <AnalyzerRequirements />

        {/* Second card */}
        <AnalyzerSkills />
      </div>

      <AnalyzerSuggestions />

      {/* CTA */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Ready to tailor your resume?
              </h3>
              <p className="text-sm text-muted-foreground">
                Use these insights to customize your application and stand out
              </p>
            </div>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5" />
              Open Resume Tailor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzeResume;
