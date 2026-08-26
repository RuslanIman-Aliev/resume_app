"use client";

import { getErrorFeedback } from "@/lib/error-feedback";
import type { JobApplicationCard } from "@/lib/types";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Optimistic `tracker.updateStatus` mutation shared by the card's "Move to"
 * dropdown and by dragging a card between columns.
 *
 * Both entry points must behave identically - same optimistic write, same
 * rollback, same toast - so the board never ends up in a state that depends on
 * which of the two the user reached for. The optimistic patch is keyed off the
 * mutation variables rather than a captured application, so the hook can be
 * called once at board level for drags and once per card for the dropdown.
 */
export const useUpdateApplicationStatus = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.tracker.updateStatus.mutationOptions({
      onMutate: async (variables) => {
        // Stop an in-flight getAll from landing after the patch and undoing it.
        await queryClient.cancelQueries({
          queryKey: trpc.tracker.getAll.queryKey(),
        });

        const previousJobs = queryClient.getQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
        );

        queryClient.setQueryData<JobApplicationCard[]>(
          trpc.tracker.getAll.queryKey(),
          (old) =>
            old?.map((job) =>
              job.id === variables.id
                ? { ...job, status: variables.status }
                : job,
            ),
        );

        return { previousJobs };
      },

      onError: (error, _variables, context) => {
        if (context?.previousJobs) {
          queryClient.setQueryData(
            trpc.tracker.getAll.queryKey(),
            context.previousJobs,
          );
        }
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to update status. Please try again.",
          }).message,
        );
      },

      onSettled: () => {
        queryClient.invalidateQueries(trpc.tracker.pathFilter());
      },
    }),
  );
};
