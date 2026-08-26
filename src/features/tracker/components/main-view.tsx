"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { KanbanColumn } from "@/features/tracker/components/kanban-column";
import { getErrorFeedback } from "@/lib/error-feedback";
import type { TrackerFormValues } from "@/lib/types";
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
    const base = {
      total: data?.length ?? 0,
      saved: 0,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    // Single pass over the list instead of one filter() per status.
    for (const application of data ?? []) {
      if (application.status in base) {
        base[application.status as keyof typeof base] += 1;
      }
    }
    return base;
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
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {stats.saved}
          </p>
          <p className="text-xs text-muted-foreground">Saved</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.applied}</p>
          <p className="text-xs text-muted-foreground">Applied</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {stats.screening}
          </p>
          <p className="text-xs text-muted-foreground">Screening</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {stats.interview}
          </p>
          <p className="text-xs text-muted-foreground">Interview</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.offer}</p>
          <p className="text-xs text-muted-foreground">Offer</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
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
        <KanbanColumn
          title="Saved"
          status="saved"
          color="text-muted-foreground"
          allJobs={data || []}
        />
        <KanbanColumn
          title="Applied"
          status="applied"
          color="text-blue-400"
          allJobs={data || []}
        />
        <KanbanColumn
          title="Screening"
          status="screening"
          color="text-yellow-400"
          allJobs={data || []}
        />
        <KanbanColumn
          title="Interview"
          status="interview"
          color="text-purple-400"
          allJobs={data || []}
        />
        <KanbanColumn
          title="Offer"
          status="offer"
          color="text-green-400"
          allJobs={data || []}
        />
        <KanbanColumn
          title="Rejected"
          status="rejected"
          color="text-red-400"
          allJobs={data || []}
        />
      </div>
    </main>
  );
};

export default MainView;
