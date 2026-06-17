import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobApplicationCard } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
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

  const columnJobs = allJobs.filter((job) => job.status === status);

  const totalPages = Math.ceil(columnJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const displayedJobs = columnJobs.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [columnJobs.length, currentPage, totalPages]);
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
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};