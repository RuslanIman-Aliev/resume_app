"use client";

import { Badge } from "@/components/ui/badge";
import type { ApplicationStatusValue, JobApplicationCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMemo } from "react";
import { JobCard } from "./job-card";

/**
 * Kanban column component that groups job applications by status.
 *
 * The whole column is a drop target, so a card can be released anywhere over
 * it - including the empty space below the last card, which is why the list
 * keeps a minimum height even when there is nothing in it.
 */
export const KanbanColumn = ({
  title,
  status,
  allJobs,
  color,
}: {
  title: string;
  status: ApplicationStatusValue;
  allJobs: JobApplicationCard[];
  color: string;
}) => {
  const columnJobs = useMemo(
    () => allJobs.filter((job) => job.status === status),
    [allJobs, status],
  );

  const jobIds = useMemo(() => columnJobs.map((job) => job.id), [columnJobs]);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <div
      className={cn(
        "flex flex-col w-72 sm:w-87.5 shrink-0 rounded-2xl p-4 transition-colors",
        isOver ? "bg-primary/5 ring-2 ring-primary/40" : "bg-card/20",
      )}
    >
      <h3 className={`font-bold mb-4 ${color}`}>
        {title}{" "}
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {columnJobs.length}
        </Badge>
      </h3>

      {/* The list scrolls instead of paginating. Height is capped in dvh so the
          mobile browser's collapsing address bar doesn't leave the column
          taller than the visible viewport. `overscroll-contain` keeps a flick
          at the end of the list from scrolling the page behind it. */}
      <div
        ref={setNodeRef}
        data-testid={`kanban-column-${status}`}
        className="flex flex-col gap-4 flex-1 min-h-24 max-h-[60dvh] overflow-y-auto overscroll-contain pr-1"
      >
        <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
          {columnJobs.map((job) => (
            <JobCard key={job.id} application={job} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};
