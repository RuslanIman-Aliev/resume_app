/* eslint-disable @typescript-eslint/no-explicit-any */

import { Badge } from "@/components/ui/badge";
import { JobCard } from "./job-card";

export const KanbanColumn = ({ title , status, allJobs, color }: { title: string; status: string; allJobs: any[]; color: string }) => {
  const columnJobs = allJobs.filter((job) => job.status === status);

  return (
    <div className="flex flex-col w-87.5 shrink-0 bg-card/20 rounded-2xl p-4">
      <h3 className={`font-bold mb-4 ${color}`}>
        {title}{" "}
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {columnJobs.length}
        </Badge>
      </h3>

      <div className="flex flex-col gap-4">
        {columnJobs.map((job) => (
          <JobCard key={job.id} application={job} />
        ))}
      </div>
    </div>
  );
};
