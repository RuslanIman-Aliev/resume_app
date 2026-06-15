"use client";
import { publicEnv } from "@/lib/env.public";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import PusherClient from "pusher-js";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook to listen for Pusher real-time events when resume analysis completes.
 * Subscribes to the "resume-updates" channel and invalidates relevant queries on completion.
 * Automatically cleans up Pusher connection on unmount or when analyzingId changes.
 * @param analyzingId - ID of the resume being analyzed (null to skip listening)
 * @param onSuccess - Callback function to execute when analysis completes
 */
export const useResumePusher = (
  analyzingId: string | null,
  onSuccess: () => void,
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
    });

    const channel = pusher.subscribe("resume-updates");

    channel.bind(`analyzed-${analyzingId}`, () => {
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

    return () => {
      channel.unbind(`analyzed-${analyzingId}`);
      pusher.unsubscribe("resume-updates");
      pusher.disconnect();
    };
  }, [analyzingId, onSuccess, trpc, queryClient]);
};

/**
 * Hook to listen for Pusher real-time events when job match analysis completes.
 * Subscribes to the "job-match" channel and invalidates relevant queries on completion.
 * Similar to useResumePusher but for job matching functionality.
 * @param applicationId - ID of the job application being analyzed (null to skip listening)
 * @param onSuccess - Callback function to execute when job match analysis completes
 */
export const useJobMatchPusher = (
  applicationId: string | null,
  onSuccess: () => void,
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
    });

    // Subscribe to the new job-match channel
    const channel = pusher.subscribe("job-match");

    channel.bind(`analyzed-${applicationId}`, () => {
      toast.success("Job Match Analysis complete!", { icon: "🎯" });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getJobMatchResult.queryOptions({
          applicationId,
        }).queryKey,
        refetchType: "active",
      });

      onSuccess();
    });

    return () => {
      channel.unbind(`analyzed-${applicationId}`);
      pusher.unsubscribe("job-match");
      pusher.disconnect();
    };
  }, [applicationId, onSuccess, trpc, queryClient]);
};
