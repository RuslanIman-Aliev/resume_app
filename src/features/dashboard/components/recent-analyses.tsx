import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Sparkles } from "lucide-react";
import Link from "next/link";

const recentAnalyses = [
  {
    id: 1,
    jobTitle: "Senior Frontend Engineer",
    company: "TechCorp Inc.",
    analyzedAt: "2 hours ago",
    matchScore: 92,
    keySkills: ["React", "TypeScript", "Next.js"],
    status: "tailored",
  },
  {
    id: 2,
    jobTitle: "Full Stack Developer",
    company: "StartupXYZ",
    analyzedAt: "Yesterday",
    matchScore: 85,
    keySkills: ["Node.js", "PostgreSQL", "AWS"],
    status: "analyzed",
  },
  {
    id: 3,
    jobTitle: "React Developer",
    company: "DataFlow",
    analyzedAt: "2 days ago",
    matchScore: 78,
    keySkills: ["React", "Redux", "GraphQL"],
    status: "analyzed",
  },
  {
    id: 4,
    jobTitle: "UI Engineer",
    company: "DesignStudio",
    analyzedAt: "3 days ago",
    matchScore: 71,
    keySkills: ["CSS", "Figma", "React"],
    status: "reviewed",
  },
];

function getScoreColor(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-chart-4";
  return "text-chart-5";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "tailored":
      return (
        <Badge className="bg-success/10 text-success border-0">
          Resume Tailored
        </Badge>
      );
    case "analyzed":
      return (
        <Badge className="bg-primary/10 text-primary border-0">Analyzed</Badge>
      );
    case "reviewed":
      return (
        <Badge className="bg-muted text-muted-foreground border-0">
          Reviewed
        </Badge>
      );
    default:
      return null;
  }
}

const RecentAnalyses = () => {
  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Recent Analyses</h1>
        {recentAnalyses.map(
          ({
            id,
            company,
            jobTitle,
            analyzedAt,
            matchScore,
            keySkills,
            status,
          }) => (
            <div key={id} className="">
              <div className="flex  mb-4  items-center gap-3 w-full rounded-lg border border-border/50 bg-secondary/30 p-4 transition-all hover:border-border hover:bg-secondary/50">
                <Avatar className="flex  items-center justify-center rounded-lg bg-primary/10 h-11 w-11 text-sm font-bold text-primary">
                  <AvatarFallback className="text-primary h-11 w-11 shrink-0 rounded-lg bg-primary/10 text-sm">
                    <FileText className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="w-full">
                  <div className="flex justify-between">
                    <div className="gap-2 flex items-center">
                      <span className="truncate font-medium text-sm">
                        {jobTitle}
                      </span>
                      {getStatusBadge(status)}
                    </div>
                    <div className="flex items-center gap-4">
                      {keySkills.slice(0, 2).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {keySkills.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{keySkills.length - 2}
                        </Badge>
                      )}
                      <div
                        className={cn(
                          `${getScoreColor(matchScore)} text-2xl font-bold`,
                        )}
                      >
                        {matchScore}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground ">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1 truncate">
                        <span className="truncate ">{company}</span>
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <span className="truncate">{analyzedAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-muted-foreground">match</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
        )}
        <div className=" flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">
            Analyze more jobs to improve your match accuracy
          </span>
          <Link href="/">
            <Button
              size="sm"
              variant="link"
              className="text-primary px-0 cursor-pointer hover:text-primary/80"
            >
              Analyze Now
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
};

export default RecentAnalyses;
