"use client";
import { publicEnv } from "@/lib/env.public";
import {
  analyzedEventName,
  failedEventName,
  jobMatchChannel,
  resumeAnalysisChannel,
} from "@/lib/pusher-channels";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import PusherClient from "pusher-js";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook to listen for Pusher real-time events about a resume analysis.
 * Subscribes to that resume's own private channel and invalidates relevant
 * queries when the run ends, either way.
 * Automatically cleans up Pusher connection on unmount or when analyzingId changes.
 * @param analyzingId - ID of the resume being analyzed (null to skip listening)
 * @param onSuccess - Callback function to execute when analysis completes
 * @param onFailure - Callback for a run that ended without a result. Bound to
 *   the event the Inngest `onFailure` handler sends: without it a dead run is
 *   only noticed by the next poll, and before that handler existed it was never
 *   noticed at all.
 */
export const useResumePusher = (
  analyzingId: string | null,
  onSuccess: () => void,
  onFailure?: () => void,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!analyzingId) return;

    if (
      !publicEnv.NEXT_PUBLIC_PUSHER_KEY ||
      !publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER
    ) {
      return;
    }

    const pusher = new PusherClient(publicEnv.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      // Private channels are signed by the server. The endpoint checks the
      // session and that the resource behind the channel belongs to it, which
      // is what stops a holder of the public key - it ships in this bundle -
      // from subscribing to somebody else's analysis.
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });

    const channelName = resumeAnalysisChannel(analyzingId);
    const channel = pusher.subscribe(channelName);

    channel.bind(analyzedEventName(analyzingId), () => {
      toast.success("Analysis complete!", { icon: "🎉" });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAnalysisResult.queryOptions({
          resumeId: analyzingId,
        }).queryKey,
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getImprovements.queryOptions({
          resumeId: analyzingId,
        }).queryKey,
        refetchType: "active",
      });

      onSuccess();
    });

    channel.bind(failedEventName(analyzingId), () => {
      // Refetched rather than patched: the query re-reads the row the failure
      // handler just wrote, so the page moves to its error state from stored
      // state instead of from a message that could have arrived twice.
      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAnalysisResult.queryOptions({
          resumeId: analyzingId,
        }).queryKey,
        refetchType: "active",
      });

      onFailure?.();
    });

    return () => {
      channel.unbind(analyzedEventName(analyzingId));
      channel.unbind(failedEventName(analyzingId));
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [analyzingId, onSuccess, onFailure, trpc, queryClient]);
};

/**
 * Hook to listen for Pusher real-time events when job match analysis completes.
 * Subscribes to that application's own private channel and invalidates
 * relevant queries on completion.
 * Similar to useResumePusher but for job matching functionality.
 * @param applicationId - ID of the job application being analyzed (null to skip listening)
 * @param onSuccess - Callback function to execute when job match analysis completes
 * @param onFailure - Callback for a run that ended without a result.
 */
export const useJobMatchPusher = (
  applicationId: string | null,
  onSuccess: () => void,
  onFailure?: () => void,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!applicationId) return;

    if (
      !publicEnv.NEXT_PUBLIC_PUSHER_KEY ||
      !publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER
    ) {
      return;
    }

    const pusher = new PusherClient(publicEnv.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: publicEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      // Private channels are signed by the server. The endpoint checks the
      // session and that the resource behind the channel belongs to it, which
      // is what stops a holder of the public key - it ships in this bundle -
      // from subscribing to somebody else's analysis.
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });

    const channelName = jobMatchChannel(applicationId);
    const channel = pusher.subscribe(channelName);

    channel.bind(analyzedEventName(applicationId), () => {
      toast.success("Job Match Analysis complete!", { icon: "🎯" });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getJobMatchResult.queryOptions({
          applicationId,
        }).queryKey,
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: trpc.tracker.getAll.queryOptions().queryKey,
        refetchType: "all",
      });

      onSuccess();
    });

    channel.bind(failedEventName(applicationId), () => {
      queryClient.invalidateQueries({
        queryKey: trpc.resume.getJobMatchResult.queryOptions({
          applicationId,
        }).queryKey,
        refetchType: "active",
      });

      onFailure?.();
    });

    return () => {
      channel.unbind(analyzedEventName(applicationId));
      channel.unbind(failedEventName(applicationId));
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [applicationId, onSuccess, onFailure, trpc, queryClient]);
};
