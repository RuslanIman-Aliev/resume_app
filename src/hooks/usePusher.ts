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
