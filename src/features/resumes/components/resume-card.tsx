import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, FileTextIcon, SparklesIcon, Target } from "lucide-react";

const mockResumes = [
  {
    id: "1",
    name: "Software Engineer - General",
    fileName: "resume_swe_general_v3.pdf",
    lastModified: "2 hours ago",
    score: 92,
    targetRole: "Software Engineer",
    version: 3,
    tags: ["Tech", "Full-Stack"],
    status: "Active",
  },
  {
    id: "2",
    name: "Frontend Developer - React",
    fileName: "resume_frontend_react.pdf",
    lastModified: "1 day ago",
    score: 88,
    targetRole: "Frontend Developer",
    version: 2,
    tags: ["React", "UI/UX"],
    status: "Active",
  },
  {
    id: "3",
    name: "Senior Engineer - FAANG",
    fileName: "resume_senior_faang.pdf",
    lastModified: "3 days ago",
    score: 85,
    targetRole: "Senior Software Engineer",
    version: 1,
    tags: ["FAANG", "Leadership"],
    status: "Active",
  },
  {
    id: "4",
    name: "Product Manager Transition",
    fileName: "resume_pm_transition.pdf",
    lastModified: "1 week ago",
    score: 76,
    targetRole: "Product Manager",
    version: 1,
    tags: ["PM", "Career Change"],
    status: "Draft",
  },
  {
    id: "5",
    name: "Data Engineer - AWS",
    fileName: "resume_data_aws.pdf",
    lastModified: "2 weeks ago",
    score: 82,
    targetRole: "Data Engineer",
    version: 2,
    tags: ["Data", "AWS", "Python"],
    status: "Archived",
  },
];

const ResumeCard = () => {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockResumes.map((resume) => (
          <Card key={resume.id} className="max-w-xl w-full ">
            <CardHeader className="flex items-center justify-between">
              <div>
                <Badge>{resume.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <SparklesIcon className="text-primary size-4" />
                <span className="text-lg text-primary">{resume.score}</span>
              </div>
            </CardHeader>
            <CardContent className="">
              <div className="flex flex-col pb-5">
                <div className="w-100 h-120">
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <FileTextIcon className="size-60" />
                    {resume.fileName}
                  </div>
                </div>
                <div className="pt-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {resume.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {resume.targetRole}
                    </p>
                  </div>

                  <div className="mt-3 flex  justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {resume.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resume.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{resume.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resume.lastModified}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ResumeCard;
