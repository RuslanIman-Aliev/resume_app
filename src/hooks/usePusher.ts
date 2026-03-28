import { useEffect } from "react";
import PusherClient from "pusher-js";
import { toast } from "sonner";

export const useResumePusher = (
  analyzingId: string | null, 
  onSuccess: () => void
) => {
  useEffect(() => {
    if (!analyzingId) return;

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("resume-updates");

    channel.bind(`analyzed-${analyzingId}`, () => {
      toast.success("Analysis complete! View your results.", { icon: "🎉" });
      onSuccess(); 
    });

    return () => {
      channel.unbind(`analyzed-${analyzingId}`);
      pusher.unsubscribe("resume-updates");
    };
  }, [analyzingId, onSuccess]);
};