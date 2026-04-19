import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SkillGapItem, SkillsGapData } from "@/lib/types";
import { cn, getImportanceStyles } from "@/lib/utils";
import { AlertTriangle, Check, X } from "lucide-react";

type AnalyzeSkillsGapProps = {
  data: SkillsGapData;
};

const SkillRow = ({ skillItem }: { skillItem: SkillGapItem }) => (
  <div className="flex flex-row items-center justify-between gap-3 py-1.5">
    <div className="flex items-center gap-3">
      {skillItem.matched ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <X className="h-4 w-4 shrink-0 text-red-500" />
      )}
      <span
        className={cn(
          "text-[18px]",
          skillItem.matched
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {skillItem.skill}
      </span>
    </div>
    {skillItem.importance && (
      <Badge
        variant="outline"
        className={cn(
          "px-2 py-0 h-5 text-[11px] uppercase font-medium",
          getImportanceStyles(skillItem.importance),
        )}
      >
        {skillItem.importance}
      </Badge>
    )}
  </div>
);

const AnalyzeSkillsGap = ({ data }: AnalyzeSkillsGapProps) => {
  return (
    <div className="flex flex-col gap-8 w-full mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="pt-2">
            <h2 className="text-2xl font-semibold tracking-tight pb-2">
              Technical Skills
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Skills mentioned in the job posting
            </p>
            <div className="space-y-1">
              {data.technical.map((skillItem: SkillGapItem, index) => (
                <SkillRow key={index} skillItem={skillItem} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="pt-2">
            <h2 className="text-2xl font-semibold tracking-tight pb-2">
              Soft Skills
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Non-technical skills required
            </p>
            <div className="space-y-1">
              {data.soft.map((skillItem, index) => (
                <SkillRow key={index} skillItem={skillItem} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.missingCriticalSkills && data.missingCriticalSkills.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-2 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h2 className="text-2xl font-semibold text-foreground">
                Missing Critical Skills
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              These skills are marked as critical or high importance but are not
              found in your resume:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.missingCriticalSkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-red-500/30 text-red-500 bg-transparent px-2.5"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyzeSkillsGap;
