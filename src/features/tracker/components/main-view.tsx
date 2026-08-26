"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { JobCardDragOverlay } from "@/features/tracker/components/job-card";
import { KanbanColumn } from "@/features/tracker/components/kanban-column";
import { useUpdateApplicationStatus } from "@/features/tracker/hooks/use-update-application-status";
import { getErrorFeedback } from "@/lib/error-feedback";
import type {
  ApplicationStatusValue,
  JobApplicationCard,
  TrackerFormValues,
} from "@/lib/types";
import { applicationStatusValues } from "@/lib/types";
import { KANBAN_COLUMN_ORDER, TRACKER_STATUS_CONFIG } from "@/lib/ui-config";
import { useTRPC } from "@/trpc/client";
import type {
  Announcements,
  DragEndEvent,
  DragStartEvent,
  ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import DialogTracker from "./dialog-tracker";
import { TrackerError, TrackerLoading } from "./tracker-states";

const isApplicationStatus = (
  value: unknown,
): value is ApplicationStatusValue =>
  typeof value === "string" &&
  (applicationStatusValues as readonly string[]).includes(value);

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "To move an application to another stage, press space or enter on its move handle. " +
    "Use the arrow keys to move between stages, then press space or enter to drop it. " +
    "Press escape to cancel. The move menu on each card does the same thing without dragging.",
};

const MainView = () => {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.tracker.getAll.queryOptions(),
  );
  const queryClient = useQueryClient();

  const jobs: JobApplicationCard[] = useMemo(() => data ?? [], [data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeJob = useMemo(
    () => jobs.find((job) => job.id === activeId) ?? null,
    [jobs, activeId],
  );

  const stats = useMemo(() => {
    const counts = Object.fromEntries(
      KANBAN_COLUMN_ORDER.map((status) => [status, 0]),
    ) as Record<ApplicationStatusValue, number>;
    // Single pass over the list instead of one filter() per status.
    for (const application of jobs) {
      if (application.status in counts) {
        counts[application.status as ApplicationStatusValue] += 1;
      }
    }
    return { total: jobs.length, counts };
  }, [jobs]);

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

  // Shared with the card's "Move to" menu: a drag and a menu pick are the same
  // mutation, so they optimistically update and roll back identically.
  const { mutate: updateStatus } = useUpdateApplicationStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Without a distance threshold every press on the handle would start a
      // drag and swallow the click that opens the card's menu.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const describeJob = useCallback(
    (id: string | number | null | undefined) => {
      const job = jobs.find((candidate) => candidate.id === id);
      if (!job) return "application";
      return `${job.position || "application"} at ${job.company || "unnamed company"}`;
    },
    [jobs],
  );

  /**
   * Which column a drop landed on.
   *
   * Both droppables carry their status in `data`: the column itself, and every
   * card in it. That means releasing over a card counts as releasing over its
   * column, without having to special-case the two.
   */
  const resolveDropStatus = useCallback((over: DragEndEvent["over"]) => {
    const status = (over?.data.current as { status?: unknown } | undefined)
      ?.status;
    return isApplicationStatus(status) ? status : null;
  }, []);

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) =>
        `Picked up ${describeJob(active.id)}. Use the arrow keys to choose a stage.`,
      onDragOver: ({ active, over }) => {
        const status = resolveDropStatus(over);
        if (!status) return `${describeJob(active.id)} is not over a stage.`;
        return `${describeJob(active.id)} is over ${TRACKER_STATUS_CONFIG[status].label}.`;
      },
      onDragEnd: ({ active, over }) => {
        const status = resolveDropStatus(over);
        if (!status)
          return `${describeJob(active.id)} was dropped outside the board and stayed where it was.`;
        return `${describeJob(active.id)} was moved to ${TRACKER_STATUS_CONFIG[status].label}.`;
      },
      onDragCancel: ({ active }) =>
        `Moving ${describeJob(active.id)} was cancelled. It stayed where it was.`,
    }),
    [describeJob, resolveDropStatus],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      const nextStatus = resolveDropStatus(over);
      if (!nextStatus) return;

      const currentStatus = (
        active.data.current as { status?: unknown } | undefined
      )?.status;

      // Only a move across columns means anything. Position within a column
      // isn't persisted - there is no order column - so a drop back into the
      // same column is deliberately a no-op rather than a fake reorder that
      // would evaporate on the next reload.
      if (currentStatus === nextStatus) return;

      updateStatus({ id: String(active.id), status: nextStatus });
    },
    [resolveDropStatus, updateStatus],
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements, screenReaderInstructions }}
        // Columns scroll now, so their rectangles move while a drag is in
        // flight. Measuring once up front would leave dnd-kit aiming at where
        // the cards used to be.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-nowrap overflow-x-auto gap-6 pb-8">
          {KANBAN_COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              title={TRACKER_STATUS_CONFIG[status].label}
              status={status}
              color={TRACKER_STATUS_CONFIG[status].textClass}
              allJobs={jobs}
            />
          ))}
        </div>

        {/* No drop animation: the optimistic update has already drawn the card
            in its new column, so animating the overlay back to the old slot
            would show the move undoing itself. */}
        <DragOverlay dropAnimation={null}>
          {activeJob ? <JobCardDragOverlay application={activeJob} /> : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
};

export default MainView;
