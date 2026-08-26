"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorFeedback } from "@/lib/error-feedback";
import type {
  JobApplicationCard,
  TrackerFormValues,
  applicationStatusValues,
} from "@/lib/types";
import { getScoreColor } from "@/lib/format";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  ExternalLink,
  Eye,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DialogTracker from "./dialog-tracker";

type StatusColumn = {
  id: "saved" | "applied" | "screening" | "interview" | "offer" | "rejected";
  label: string;
  color: string;
};

const STATUS_COLUMNS: StatusColumn[] = [
  { id: "saved", label: "Saved", color: "text-muted-foreground" },
  { id: "applied", label: "Applied", color: "text-blue-400" },
  { id: "screening", label: "Screening", color: "text-yellow-400" },
  { id: "interview", label: "Interview", color: "text-purple-400" },
  { id: "offer", label: "Offer", color: "text-primary" },
  { id: "rejected", label: "Rejected", color: "text-red-400" },
];

/**
 * Job card component for displaying individual job application in kanban/list view.
 * Shows company info, job title, match score, and action menu.
 */
export const JobCard = ({
  application,
}: {
  application: JobApplicationCard;
}) => {
  const [dialogMode, setDialogMode] = useState<"closed" | "view" | "edit">(
    "closed",
  );
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: updateApplication } = useMutation(
    trpc.tracker.update.mutationOptions({
      onSuccess: () => {
        toast.success("Application updated!");
        queryClient.invalidateQueries(trpc.tracker.pathFilter());
        setDialogMode("closed");
      },
      onError: () => {
        toast.error("Failed to update application.");
      },
    }),
  );

  const { mutate: deleteApplication } = useMutation(
    trpc.tracker.delete.mutationOptions({
      onMutate: async (deletedVars) => {
        await queryClient.cancelQueries({
          queryKey: trpc.tracker.getAll.queryKey(),
        });

        const previousJobs = queryClient.getQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
        );

        queryClient.setQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
          (old) => {
            if (!old) return old;
            return old.filter((job) => job.id !== deletedVars.id);
          },
        );

        return { previousJobs };
      },

      onSuccess: () => {
        toast.success("Application deleted successfully!");
      },

      onError: (error, _, context) => {
        if (context?.previousJobs) {
          queryClient.setQueryData(
            trpc.tracker.getAll.queryKey(),
            context.previousJobs,
          );
        }
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to delete application. Please try again.",
          }).message,
        );
      },

      onSettled: () => {
        queryClient.invalidateQueries(trpc.tracker.pathFilter());
      },
    }),
  );

  const { mutate: updateStatus } = useMutation(
    trpc.tracker.updateStatus.mutationOptions({
      onMutate: async (newVariables) => {
        await queryClient.cancelQueries({
          queryKey: trpc.tracker.getAll.queryKey(),
        });

        const previousJobs = queryClient.getQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
        );

        queryClient.setQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
          (old) => {
            if (!old) return old;
            return old.map((job) =>
              job.id === application.id
                ? { ...job, status: newVariables.status }
                : job,
            );
          },
        );

        return { previousJobs };
      },

      onError: (err, newVariables, context) => {
        if (context?.previousJobs) {
          queryClient.setQueryData(
            trpc.tracker.getAll.queryKey(),
            context.previousJobs,
          );
        }
        toast.error("Failed to update status. Please try again.");
      },

      onSettled: () => {
        queryClient.invalidateQueries(trpc.tracker.pathFilter());
      },
    }),
  );

  const defaultValues: TrackerFormValues = {
    company: application.company || "",
    position: application.position || "",
    location: application.location || "",
    salary: application.salary || "",
    status: application.status as (typeof applicationStatusValues)[number],
    url: application.url || "",
    notes: application.notes || "",
    contactName: application.contactName || "",
    contactEmail: application.contactEmail || "",
  };

  function onStatusChange(
    applicationId: string,
    statusId:
      | "saved"
      | "applied"
      | "screening"
      | "interview"
      | "offer"
      | "rejected",
  ) {
    updateStatus({ id: applicationId, status: statusId });
  }

  return (
    <>
      <div className="group bg-card/80 border border-border/50 rounded-lg p-3 hover:border-primary/30 transition-colors cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold">
              {application.company?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-sm leading-tight">
                {application.company || "Unnamed Company"}
              </h4>
              <p className="text-xs text-muted-foreground truncate max-w-full sm:max-w-35">
                {application.position || "Unnamed Position"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 transition-opacity sm:size-6 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setDialogMode("view")}
                className="min-h-11 sm:min-h-0"
              >
                <Eye className="h-4 w-4 mr-2" />
                Show Info
              </DropdownMenuItem>

              {/* 4. Update your Edit button */}
              <DropdownMenuItem
                onClick={() => setDialogMode("edit")}
                className="min-h-11 sm:min-h-0"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {application.url && (
                <DropdownMenuItem asChild className="min-h-11 sm:min-h-0">
                  <a
                    href={application.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Job Posting
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground min-h-11 sm:min-h-0">
                Move to
                <ChevronRight className="h-4 w-4 ml-auto" />
              </DropdownMenuItem>
              {STATUS_COLUMNS.map((status) => (
                <DropdownMenuItem
                  key={status.id}
                  onClick={() => onStatusChange(application.id, status.id)}
                  className="pl-6 min-h-11 sm:min-h-0"
                >
                  <span className={status.color}>{status.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => deleteApplication({ id: application.id })}
                className="text-red-400 min-h-11 sm:min-h-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{application.location}</span>
          </div>
          {application.salary && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              <span>{application.salary}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          {application.matchScore && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Match:</span>
              <span
                className={`text-xs font-medium ${getScoreColor(application.matchScore)}`}
              >
                {application.matchScore}%
              </span>
            </div>
          )}
          {application.appliedDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(application.appliedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
        <Dialog
          open={dialogMode !== "closed"}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDialogMode("closed");
          }}
        >
          {/* Mount only while open so the form re-initializes from the current
              application data on each open and we don't keep a react-hook-form
              instance alive for every card on the board. */}
          {dialogMode !== "closed" && (
            <DialogTracker
              initialData={defaultValues}
              readOnly={dialogMode === "view"}
              onClose={() => setDialogMode("closed")}
              onSubmit={async (values) => {
                await updateApplication({ id: application.id, ...values });
              }}
            />
          )}
        </Dialog>

        {application.nextStep && (
          <div className="mt-2 p-2 bg-primary/10 rounded-md">
            <p className="text-xs text-primary font-medium">
              {application.nextStep}
            </p>
            {application.nextStepDate && (
              <p className="text-xs text-primary/70">
                {new Date(application.nextStepDate).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};
