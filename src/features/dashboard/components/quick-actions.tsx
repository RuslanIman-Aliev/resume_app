import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { FileText, Sparkles, Target, Upload } from "lucide-react";
import Link from "next/link";

const actions = [
  {
    id: "analyze",
    title: "Analyze Job",
    description: "Paste a job description to extract requirements",
    icon: FileText,
    href: "/",
    color: "text-primary",
    bgColor: "bg-primary/10",
    primary: true,
  },
  {
    id: "upload",
    title: "Upload Resume",
    description: "Upload your resume for AI optimization",
    icon: Upload,
    href: "/resume",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    id: "tailor",
    title: "Tailor Resume",
    description: "Customize your resume for a specific job",
    icon: Sparkles,
    href: "/tailor",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    id: "track",
    title: "Track Application",
    description: "Add a new job application to your tracker",
    icon: Target,
    href: "/applications/new",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

const QuickActions = () => {
  return ( <section>
              <Card className="p-6">
                <h1 className="text-lg font-bold mb-2">Quick Actions</h1>
                {actions.map(
                  ({
                    id,
                    title,
                    description,
                    icon: Icon,
                    href,
                    color,
                    bgColor,
                  }) => (
                    <div key={id} className="">
                      <div className="flex   items-center gap-3 w-full rounded-lg  py-2 px-4 transition-all hover:border-border hover:bg-secondary/50">
                        <Avatar
                          className={`flex ${bgColor}  items-center justify-center rounded-lg  h-8 w-8 text-sm font-bold `}
                        >
                          <AvatarFallback
                            className={` ${color} h-8 w-8 ${bgColor} shrink-0 rounded-lg text-sm`}
                          >
                            <Icon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>

                        <Link href={href} className="w-full">
                          <div className="text-md">{title}</div>
                          <div className="text-xs text-muted-foreground">
                            {description}
                          </div>
                        </Link>
                      </div>
                    </div>
                  ),
                )}
              </Card>
            </section> );
}
 
export default QuickActions;