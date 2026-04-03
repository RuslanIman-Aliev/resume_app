"use client";
import { useEffect } from "react";
import PusherClient from "pusher-js";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

// Custom hook to listen for Pusher events related to resume analysis completion.
// It takes the ID of the resume being analyzed and a callback function to execute when the analysis is complete.
// The hook sets up a Pusher client, subscribes to the relevant channel and event,
// and handles cleanup when the component unmounts or when the analyzingId changes.

export const useResumePusher = (
  analyzingId: string | null,
  onSuccess: () => void,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!analyzingId) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("resume-updates");

    channel.bind(`analyzed-${analyzingId}`, () => {
      toast.success("Analysis complete!", { icon: "🎉" });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAnalysisResult.queryOptions({
          resumeId: analyzingId,
        }).queryKey,
      });

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getImprovements.queryOptions({
          resumeId: analyzingId,
        }).queryKey,
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

// Similar custom hook for job match analysis completion events. It listens for events on the "job-match" channel and invalidates the relevant queries when a job match analysis is complete.
// This allows the UI to react to the completion of background analyses without needing to poll for updates, providing a more responsive user experience.
// Note: The onSuccess callback can be used to perform additional actions, such as navigating to a results page or updating local state, when the analysis is complete.
// The use of environment variables for the Pusher key and cluster ensures that sensitive information is not hardcoded and can be easily configured for different environments (development, staging, production).
// Overall, these hooks abstract away the complexity of setting up real-time listeners for analysis completion events and provide a clean interface for components to react to these events in a user-friendly way.

export const useJobMatchPusher = (
  applicationId: string | null,
  onSuccess: () => void,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!applicationId) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to the new job-match channel
    const channel = pusher.subscribe("job-match");

    channel.bind(`analyzed-${applicationId}`, () => {
      toast.success("Job Match Analysis complete!", { icon: "🎯" });

      // Invalidate the query that fetches the specific job match results
      // queryClient.invalidateQueries({
      //   queryKey: trpc.jobApplication.getById.queryOptions({
      //     applicationId: applicationId,
      //   }).queryKey,
      // });

      onSuccess();
    });

    return () => {
      channel.unbind(`analyzed-${applicationId}`);
      pusher.unsubscribe("job-match");
      pusher.disconnect();
    };
  }, [applicationId, onSuccess, trpc, queryClient]);
};