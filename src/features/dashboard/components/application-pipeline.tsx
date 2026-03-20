import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, Calendar, MapPin } from "lucide-react";

const pipelineStages = [
  { id: "saved", label: "Saved", count: 15, color: "bg-muted" },
  { id: "applied", label: "Applied", count: 8, color: "bg-primary" },
  { id: "screening", label: "Screening", count: 4, color: "bg-chart-4" },
  { id: "interview", label: "Interview", count: 3, color: "bg-chart-2" },
  { id: "offer", label: "Offer", count: 1, color: "bg-success" },
];

const applications = [
  {
    id: 1,
    company: "TechCorp Inc.",
    role: "Senior Frontend Engineer",
    location: "San Francisco, CA",
    stage: "interview",
    matchScore: 92,
    appliedDate: "2 days ago",
    logo: "TC",
  },
  {
    id: 2,
    company: "StartupXYZ",
    role: "Full Stack Developer",
    location: "Remote",
    stage: "screening",
    matchScore: 85,
    appliedDate: "5 days ago",
    logo: "SX",
  },
  {
    id: 3,
    company: "DataFlow",
    role: "React Developer",
    location: "New York, NY",
    stage: "applied",
    matchScore: 78,
    appliedDate: "1 week ago",
    logo: "DF",
  },
  {
    id: 4,
    company: "CloudScale",
    role: "Software Engineer",
    location: "Austin, TX",
    stage: "applied",
    matchScore: 74,
    appliedDate: "1 week ago",
    logo: "CS",
  },
];

const stageColors: Record<string, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-primary/10 text-primary",
  screening: "bg-chart-4/10 text-chart-4",
  interview: "bg-chart-2/10 text-chart-2",
  offer: "bg-success/10 text-success",
};

const ApplicationPipeline = () => {
  const totalApplications = pipelineStages.reduce(
    (acc, stage) => acc + stage.count,
    0,
  );
  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Application Pipeline</h1>
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-2">
            {pipelineStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`h-2 ${stage.color} rounded-full transition-all`}
                style={{
                  width: `${(stage.count / totalApplications) * 100}%`,
                  minWidth: stage.count > 0 ? "8px" : "0",
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {pipelineStages.map((stage) => (
              <div key={stage.id} className="flex flex-col items-center">
                <span className="font-medium text-foreground">
                  {stage.count}
                </span>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
        {applications.map(
          ({
            id,
            company,
            logo,
            role,
            location,
            stage,
            matchScore,
            appliedDate,
          }) => (
            <div key={id} className="">
              <div className="flex  mb-4  items-center gap-3 w-full rounded-lg border border-border/50 bg-secondary/30 p-4 transition-all hover:border-border hover:bg-secondary/50">
                <Avatar className="flex  items-center justify-center rounded-lg bg-primary/10 h-11 w-11 text-sm font-bold text-primary">
                  <AvatarFallback className="text-primary h-11 w-11 shrink-0 rounded-lg bg-primary/10 text-sm">
                    {logo}
                  </AvatarFallback>
                </Avatar>

                <div className="w-full">
                  <div className="flex justify-between">
                    <div className="gap-2 flex items-center">
                      <span className="truncate font-medium text-sm">
                        {role}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${stageColors[stage]}`}
                      >
                        {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-muted-foreground">Match </p>
                      <Progress value={matchScore} className="w-16 h-2" />
                      <div className="text-primary">{matchScore}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{company}</span>
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      <span>{appliedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
        )}
      </Card>
    </section>
  );
};

export default ApplicationPipeline;
