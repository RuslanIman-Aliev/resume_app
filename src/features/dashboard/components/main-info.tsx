import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, FileText, Send,  Trophy,TrendingUpIcon } from "lucide-react";

const stats = [
  {
    key: "analyzed" as const,
    label: "Jobs Analyzed",
    icon: FileText,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "applied" as const,
    label: "Applications Sent",
    icon: Send,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    key: "interviews" as const,
    label: "Interviews",
    icon: Calendar,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    key: "offers" as const,
    label: "Offers Received",
    icon: Trophy,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];


const statsData = {
  analyzed: { value: 156, change: 34, trend: "up" as const },
  applied: { value: 89, change: 22, trend: "up" as const },
  interviews: { value: 24, change: 15, trend: "up" as const },
  offers: { value: 5, change: 25, trend: "up" as const },
};

const MainInfo = () => {
  return ( <>
   <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-lg text-muted-foreground">
                Track your job search progress and recent activity
              </p>
            </div>
            <div>
              {["7d", "30d", "90d"].map((option) => (
                <Button
                  variant="ghost"
                  key={option}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    option === "7d"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "7d"
                    ? "7 Days"
                    : option === "30d"
                      ? "30 Days"
                      : "90 Days"}
                </Button>
              ))}
            </div>
          </div>
  
          <div className="mt-6 grid  sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Content for the selected time range */}
  
            {stats.map(({ key, label, icon: Icon, color, bgColor }) => {
              const { value, change, trend } = statsData[key];
              return (
                <Card key={key} className="flex gap-4 ">
                  <CardContent className="p-6 space-y-2 overflow-hidden relative">
                    <div className="flex items-center justify-between">
                      <div className={cn(" p-2.5 rounded-lg ", bgColor)}>
                        <Icon className={`h-5 w-5  ${color}`} />
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-medium ${
                          trend === "up"
                            ? "text-success"
                            : trend === "down"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {trend === "up" ? (
                          <TrendingUpIcon className="h-3 w-3" />
                        ) : trend === "down" ? (
                          <TrendingUpIcon className="h-3 w-3 rotate-180" />
                        ) : null}
  
                        <span>
                          {change > 0 ? "+" : ""}
                          {change}%
                        </span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    <p className="text-sm  text-muted-foreground">{label}</p>
                    <div
                      className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full ${bgColor} opacity-50 blur-2xl`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
  </> );
}
 
export default MainInfo;