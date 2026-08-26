"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorFeedback } from "@/lib/error-feedback";
import type { MatchingSkillItem, MissingSkillItem } from "@/lib/types";
import { Check, Copy, Download, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyDataCard } from "./empty-data-card";

type AnalyzeCoverLetterProps = {
  coverLetterText: string | null;
  matchingSkills: MatchingSkillItem[];
  missingSkills: MissingSkillItem[];
  companyName: string | null;
  jobTitle: string | null;
};

const FALLBACK_FILE_NAME = "cover-letter.txt";

/**
 * Reduces a free-form value to a lowercase, hyphenated ASCII slug.
 * Returns an empty string when nothing usable is left, which happens for
 * non-latin company or job titles - the caller falls back in that case.
 */
const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Builds a `cover-letter-{company}-{position}.txt` file name, dropping parts
 * that are missing or unslugifiable and falling back to a generic name.
 */
const buildFileName = (companyName: string | null, jobTitle: string | null) => {
  const parts = [companyName ?? "", jobTitle ?? ""]
    .map((part) => slugify(part))
    .filter(Boolean);

  return parts.length > 0
    ? `cover-letter-${parts.join("-")}.txt`
    : FALLBACK_FILE_NAME;
};

const AnalyzeCoverLetter = ({
  coverLetterText,
  matchingSkills,
  missingSkills,
  companyName,
  jobTitle,
}: AnalyzeCoverLetterProps) => {
  const letter = coverLetterText?.trim() ? coverLetterText : null;

  const handleCopy = async () => {
    if (!letter) return;

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(letter);
      toast.success("Cover letter copied to clipboard.");
    } catch (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to copy the cover letter.",
        }).message,
      );
    }
  };

  const handleDownload = () => {
    if (!letter) return;

    let objectUrl: string | null = null;

    try {
      const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = buildFileName(companyName, jobTitle);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to download the cover letter.",
        }).message,
      );
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {letter ? (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="pt-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold tracking-tight">
                    Cover Letter
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generated from your resume and this job description.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .txt
                </Button>
              </div>
            </div>

            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
              {letter}
            </p>
          </CardContent>
        </Card>
      ) : (
        <EmptyDataCard
          title="No Cover Letter Yet"
          description="This analysis was saved without a cover letter. Re-run the job match analysis to generate one."
          icon={<FileText className="h-8 w-8 text-muted-foreground/50" />}
        />
      )}

      {(matchingSkills.length > 0 || missingSkills.length > 0) && (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {matchingSkills.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-2">
                <div className="mb-1 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-xl font-semibold tracking-tight text-green-500">
                    Matching Skills ({matchingSkills.length})
                  </h3>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Skills the job asks for that your resume already covers
                </p>
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map((item, index) => (
                    <Badge
                      key={`${item.skill}-${index}`}
                      variant="outline"
                      className="h-auto border-green-500/30 bg-green-500/10 px-2.5 py-0.5 font-normal text-green-500"
                    >
                      {item.skill}
                      {item.importance && (
                        <span className="ml-1.5 text-[11px] uppercase opacity-70">
                          {item.importance}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {missingSkills.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="pt-2">
                <div className="mb-1 flex items-center gap-2">
                  <X className="h-5 w-5 text-red-500" />
                  <h3 className="text-xl font-semibold tracking-tight text-red-500">
                    Missing Skills ({missingSkills.length})
                  </h3>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Skills the job asks for that your resume does not show yet
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((item, index) => (
                    <Badge
                      key={`${item.skill}-${index}`}
                      variant="outline"
                      className="h-auto border-red-500/30 bg-red-500/10 px-2.5 py-0.5 font-normal text-red-500"
                    >
                      {item.skill}
                      {item.impact && (
                        <span className="ml-1.5 text-[11px] uppercase opacity-70">
                          {item.impact}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyzeCoverLetter;
