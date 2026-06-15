"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "@/features/tracker/components/kanban-column";
import { getErrorFeedback } from "@/lib/error-feedback";
import type { TrackerFormValues } from "@/lib/types";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { useState } from "react";
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

  const stats = {
    total: data?.length || 0,
    saved: data?.filter((a) => a.status === "saved").length || 0,
    applied: data?.filter((a) => a.status === "applied").length || 0,
    screening: data?.filter((a) => a.status === "screening").length || 0,
    interview: data?.filter((a) => a.status === "interview").length || 0,
    offer: data?.filter((a) => a.status === "offer").length || 0,
    rejected: data?.filter((a) => a.status === "rejected").length || 0,
  };

  const { mutate } = useMutation(
    trpc.tracker.create.mutationOptions({
      onSuccess: async () => {
        toast.info("Application added successfully!");
        await queryClient.invalidateQueries({
          queryKey: trpc.tracker.getAll.queryKey(),
        });
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              className="pl-10 bg-secondary/30 border-border/50"
              //value={searchQuery}
              //onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="shrink-0">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border/50 rounded-lg p-1">
            <Button
              variant={"ghost"}
              //variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              //onClick={() => setViewMode("kanban")}
              className="h-8 "
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Board
            </Button>
            <Button
              variant={"secondary"}
              //variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              // onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
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
