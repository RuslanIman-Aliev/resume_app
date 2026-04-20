"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KeywordsGapData } from "@/lib/types";
import { Check, X } from "lucide-react";
import { EmptyDataCard } from "./empty-data-card";

type AnalyzeKeywordsProps = {
  data: KeywordsGapData;
};

const AnalyzeKeywords = ({ data }: AnalyzeKeywordsProps) => {
  const isDataEmpty = data.found.length === 0 && data.missing.length === 0;

  if (isDataEmpty) {
    return (
      <EmptyDataCard
        title="No Keywords Found"
        description="We couldn't extract any specific keywords to analyze against your resume."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-semibold tracking-tight text-green-500">
                Keywords Found ({data.found.length})
              </h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              These keywords are already in your resume
            </p>
            <div className="flex flex-wrap gap-2">
              {data.found.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-green-500/30 bg-green-500/10 text-green-500 px-2.5 py-0.5 font-normal"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <X className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold tracking-tight text-red-500">
                Missing Keywords ({data.missing.length})
              </h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Add these keywords to improve ATS matching
            </p>
            <div className="flex flex-wrap gap-2">
              {data.missing.map((keyword, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-red-500/30 bg-red-500/10 text-red-500 px-2.5 py-0.5 font-normal flex items-center gap-1.5 cursor-pointer hover:bg-red-500/20 transition-colors"
                  onClick={() => navigator.clipboard.writeText(keyword)}
                  title="Click to copy"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className=" mt-6 flex flex-row items-center justify-between">
        <CardContent className="my-2 flex flex-row items-center justify-between w-full">
          <div>
            <h2 className="text-lg font-semibold">
              {" "}
              Generate Resume with Keyword Analysis
            </h2>
            <p className="text-muted-foreground text-sm">
              Click the button below to generate a new resume with the analyzed
              keywords.
            </p>
          </div>
          <Button variant="ghost" className="bg-black">
            Generate Resume
          </Button>
        </CardContent>
      </Card>
    </>
  );
};

export default AnalyzeKeywords;
