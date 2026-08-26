"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { KanbanColumn } from "@/features/tracker/components/kanban-column";
import { getErrorFeedback } from "@/lib/error-feedback";
import type { ApplicationStatusValue, TrackerFormValues } from "@/lib/types";
import { KANBAN_COLUMN_ORDER, TRACKER_STATUS_CONFIG } from "@/lib/ui-config";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import DialogTracker from "./dialog-tracker";
import { TrackerError, TrackerLoading } from "./tracker-states";

const MainView = () => {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.tracker.getAll.queryOptions(),
  );
  const queryClient = useQueryClient();

  const stats = useMemo(() => {
    const counts = Object.fromEntries(
      KANBAN_COLUMN_ORDER.map((status) => [status, 0]),
    ) as Record<ApplicationStatusValue, number>;
    // Single pass over the list instead of one filter() per status.
    for (const application of data ?? []) {
      if (application.status in counts) {
        counts[application.status as ApplicationStatusValue] += 1;
      }
    }
    return { total: data?.length ?? 0, counts };
  }, [data]);

  const { mutate } = useMutation(
    trpc.tracker.create.mutationOptions({
      onSuccess: async () => {
        toast.info("Application added successfully!");
        await queryClient.invalidateQueries(trpc.tracker.pathFilter());
      },
      onError: (error) => {
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to trigger analysis. Please try again.",
          }).message,
        );
      },
    }),
  );

  function handleAddApplication(values: TrackerFormValues) {
    mutate(values);
    setOpen(false);
  }

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <TrackerLoading />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <TrackerError onRetry={refetch} isRetrying={isFetching} />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Application Tracker
        </h1>
        <p className="text-muted-foreground">
          Track and manage all your job applications in one place.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        {KANBAN_COLUMN_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-lg border border-border/50 bg-card/50 p-3 text-center"
          >
            <p
              className={`text-2xl font-bold ${TRACKER_STATUS_CONFIG[status].textClass}`}
            >
              {stats.counts[status]}
            </p>
            <p className="text-xs text-muted-foreground">
              {TRACKER_STATUS_CONFIG[status].label}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-end gap-4 mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full sm:h-8 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>

          <DialogTracker
            onSubmit={handleAddApplication}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </div>
      <div className="flex flex-nowrap overflow-x-auto gap-6 pb-8">
        {KANBAN_COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            title={TRACKER_STATUS_CONFIG[status].label}
            status={status}
            color={TRACKER_STATUS_CONFIG[status].textClass}
            allJobs={data || []}
          />
        ))}
      </div>
    </main>
  );
};

export default MainView;
