"use client";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  FileText,
  RefreshCcw,
  Send,
  Trophy,
} from "lucide-react";

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
    label: "In Interviews",
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

const MainInfo = () => {
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.tracker.getStatistics.queryOptions(),
  );

  return (
    <>
      <div className="flex flex-col">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Track your job search progress and recent activity
        </p>
      </div>

      {isError ? (
        <Card className="mt-6 p-6">
          <FeedbackState
            status="error"
            layout="inline"
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            title="Unable to load your job search stats"
            description="Please try again in a moment."
            primaryAction={{
              label: "Retry",
              onClick: () => refetch(),
              disabled: isFetching,
              icon: (
                <RefreshCcw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                />
              ),
              variant: "secondary",
            }}
          />
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ key, label, icon: Icon, color, bgColor }) => (
            <Card key={key} className="flex gap-4 ">
              <CardContent className="p-6 space-y-2 overflow-hidden relative">
                <div className="flex items-center justify-between">
                  <div className={cn(" p-2.5 rounded-lg ", bgColor)}>
                    <Icon className={`h-5 w-5  ${color}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-9 w-14" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight">
                    {data?.[key] ?? 0}
                  </p>
                )}
                <p className="text-sm  text-muted-foreground">{label}</p>
                <div
                  className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full ${bgColor} opacity-50 blur-2xl`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default MainInfo;
