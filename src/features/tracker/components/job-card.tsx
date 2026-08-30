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
import { useUpdateApplicationStatus } from "@/features/tracker/hooks/use-update-application-status";
import { getErrorFeedback } from "@/lib/error-feedback";
import { getScoreColor } from "@/lib/format";
import { isSafeHttpUrl } from "@/lib/safe-url";
import type {
  ApplicationStatusValue,
  JobApplicationCard,
  TrackerFormValues,
} from "@/lib/types";
import { KANBAN_COLUMN_ORDER, TRACKER_STATUS_CONFIG } from "@/lib/ui-config";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useSortable } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  ExternalLink,
  Eye,
  GripVertical,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import DialogTracker from "./dialog-tracker";

/**
 * The card's visuals, with no drag or dialog wiring of its own.
 *
 * Shared by the card on the board and by the `DragOverlay` copy that follows
 * the pointer, so the thing being dragged looks exactly like the thing that was
 * picked up rather than a second markup tree that can drift out of step.
 */
const JobCardBody = ({
  application,
  handle,
  menu,
  children,
}: {
  application: JobApplicationCard;
  handle?: ReactNode;
  menu?: ReactNode;
  children?: ReactNode;
}) => (
  <>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2 min-w-0">
        {handle}
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
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

      {menu}
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

    {children}

    {application.nextStep && (
      <div className="mt-2 p-2 bg-primary/10 rounded-md">
        <p className="text-xs text-primary font-medium">
          {application.nextStep}
        </p>
        {application.nextStepDate && (
          <p className="text-xs text-primary/70">
            {new Date(application.nextStepDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    )}
  </>
);

const CARD_SHELL =
  "group bg-card/80 border border-border/50 rounded-lg p-3 transition-colors";

/**
 * The card as it follows the pointer during a drag.
 *
 * Rendered inside `DragOverlay`, which sits outside every scroll container -
 * that is what lets the card travel across the board's horizontal scroller and
 * the column's vertical one instead of being clipped by whichever it started in.
 */
export const JobCardDragOverlay = ({
  application,
}: {
  application: JobApplicationCard;
}) => (
  <div
    className={cn(CARD_SHELL, "cursor-grabbing shadow-lg ring-2 ring-primary/50")}
  >
    <JobCardBody
      application={application}
      handle={
        <span className="flex size-11 shrink-0 items-center justify-center text-muted-foreground sm:size-6">
          <GripVertical className="h-4 w-4" />
        </span>
      }
    />
  </div>
);

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

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: { type: "card", status: application.status },
  });

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

  // The same optimistic mutation the board uses for drags, so "Move to" and a
  // drag are two front doors onto one behaviour.
  const { mutate: updateStatus } = useUpdateApplicationStatus();

  // Rows written before the URL was validated - and any the model filled in -
  // can still hold a non-http value, so the stored string is re-checked here
  // rather than trusted because it came from our own database.
  const jobPostingUrl = isSafeHttpUrl(application.url) ? application.url : null;

  const defaultValues: TrackerFormValues = {
    company: application.company || "",
    position: application.position || "",
    location: application.location || "",
    salary: application.salary || "",
    status: application.status as ApplicationStatusValue,
    url: jobPostingUrl ?? "",
    notes: application.notes || "",
    contactName: application.contactName || "",
    contactEmail: application.contactEmail || "",
  };

  function onStatusChange(
    applicationId: string,
    statusId: ApplicationStatusValue,
  ) {
    updateStatus({ id: applicationId, status: statusId });
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        // Translation only: a sortable transform also carries a scale, and
        // stretching the card while it moves reads as a glitch.
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
      className={cn(
        CARD_SHELL,
        "hover:border-primary/30",
        // The card keeps its place in the flow so the column doesn't collapse
        // under the pointer; the copy being dragged is the DragOverlay one.
        isDragging && "opacity-40",
      )}
    >
      <JobCardBody
        application={application}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            // `touch-action: none` belongs here and nowhere else: the column
            // scrolls vertically, and taking touch-action away from the whole
            // card would make the board unscrollable by finger.
            className="flex size-11 shrink-0 touch-none cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing sm:size-6"
            aria-label={`Move ${application.position || "application"} at ${application.company || "unnamed company"}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${application.position || "application"} at ${application.company || "unnamed company"}`}
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
              {jobPostingUrl && (
                <DropdownMenuItem asChild className="min-h-11 sm:min-h-0">
                  <a
                    href={jobPostingUrl}
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
              {KANBAN_COLUMN_ORDER.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusChange(application.id, status)}
                  className="pl-6 min-h-11 sm:min-h-0"
                >
                  <span className={TRACKER_STATUS_CONFIG[status].textClass}>
                    {TRACKER_STATUS_CONFIG[status].label}
                  </span>
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
        }
      >
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
      </JobCardBody>
    </div>
  );
};
