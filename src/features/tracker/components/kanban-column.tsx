"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobApplicationCard } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { JobCard } from "./job-card";

/**
 * Kanban column component that groups job applications by status.
 * Displays a filtered list of jobs with client-side pagination.
 */
export const KanbanColumn = ({
  title,
  status,
  allJobs,
  color,
}: {
  title: string;
  status: string;
  allJobs: JobApplicationCard[];
  color: string;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 2;

  const columnJobs = useMemo(
    () => allJobs.filter((job) => job.status === status),
    [allJobs, status],
  );

  const totalPages = Math.ceil(columnJobs.length / ITEMS_PER_PAGE);
  // Clamp during render instead of syncing via an effect: when the column
  // shrinks (e.g. after a drag or delete) the page stays in range without an
  // extra render pass or flash.
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const displayedJobs = columnJobs.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col w-87.5 shrink-0 bg-card/20 rounded-2xl p-4">
      <h3 className={`font-bold mb-4 ${color}`}>
        {title}{" "}
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {columnJobs.length} 
        </Badge>
      </h3>

      <div className="flex flex-col gap-4 flex-1">
        {displayedJobs.map((job) => (
          <JobCard key={job.id} application={job} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};