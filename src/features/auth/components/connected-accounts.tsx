"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  authClient,
  getOAuthErrorMessage,
  linkGoogleAccount,
} from "@/lib/auth-client";
import { getErrorFeedback } from "@/lib/error-feedback";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const linkedAccountsQueryKey = ["auth", "linked-accounts"] as const;

export function ConnectedAccounts({ oauthError }: { oauthError?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: linkedAccountsQueryKey,
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw error;
      return data;
    },
  });

  // Better Auth redirects a failed link attempt back here as `?error=<code>`.
  useEffect(() => {
    if (!oauthError) return;
    toast.error(getOAuthErrorMessage(oauthError));
    router.replace("/dashboard/settings");
  }, [oauthError, router]);

  const google = accounts?.find((account) => account.providerId === "google");

  async function onConnect() {
    setIsPending(true);

    const { error } = await linkGoogleAccount();

    // Success redirects the browser to Google, so only failures land here.
    if (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "We could not connect your Google account.",
        }).message,
      );
      setIsPending(false);
    }
  }

  async function onDisconnect() {
    if (!google) return;
    setIsPending(true);

    const { error } = await authClient.unlinkAccount({
      providerId: "google",
      accountId: google.accountId,
    });

    if (error) {
      // Better Auth refuses to remove the last account, which would lock the
      // user out entirely.
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "We could not disconnect your Google account.",
        }).message,
      );
    } else {
      toast.success("Google account disconnected.");
      // The list is client-owned cache, so `router.refresh()` would not touch
      // it: without an explicit invalidation the row keeps showing "Connected"
      // until `staleTime` expires.
      await queryClient.invalidateQueries({ queryKey: linkedAccountsQueryKey });
    }

    setIsPending(false);
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Connected accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect Google to sign in with one click instead of your password.
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="min-w-0">
          <p className="font-medium">Google</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : google ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-chart-2" />
              Connected
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Not connected</p>
          )}
        </div>

        {!isLoading &&
          (google ? (
            <Button
              variant="outline"
              onClick={onDisconnect}
              disabled={isPending}
            >
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={isPending}>
              {isPending ? "Connecting..." : "Connect"}
            </Button>
          ))}
      </div>
    </Card>
  );
}
