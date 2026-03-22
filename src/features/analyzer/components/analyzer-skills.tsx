import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Zap } from "lucide-react";

const AnalyzerSkills = () => {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur py-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Skills Identified
        </CardTitle>
        <CardDescription>
          Technical and soft skills mentioned in the posting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            Technical Skills
          </h4>
          {/* Render later a list of required qualifications */}
          <div className="flex flex-row flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              React
            </Badge>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              React
            </Badge>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              React
            </Badge>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              React
            </Badge>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              React
            </Badge>
          </div>

          <h4 className="text-sm font-semibold text-foreground my-3 flex items-center gap-2">
            Soft Skills
          </h4>
          {/* Render later a list of preferred qualifications */}
          <div className="flex flex-row flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-border/50 text-muted-foreground"
            >
              Communication Skills
            </Badge>
            <Badge
              variant="outline"
              className="border-border/50 text-muted-foreground"
            >
              Communication Skills
            </Badge>
            <Badge
              variant="outline"
              className="border-border/50 text-muted-foreground"
            >
              Communication Skills
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyzerSkills;
