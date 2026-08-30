"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { getErrorFeedback } from "@/lib/error-feedback";
import { ResetPasswordFormData, resetPasswordFormSchema } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type ResetPasswordFormProps = {
  /** Token from the emailed link, absent when the link was tampered with. */
  token?: string;
  /** `INVALID_TOKEN` when Better Auth rejected the link before redirecting. */
  error?: string;
};

export function ResetPasswordForm({ token, error }: ResetPasswordFormProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // An expired or reused link lands here with no usable token. Showing the
  // password fields anyway would only fail on submit.
  const isLinkUnusable = !token || Boolean(error);

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) return;

    setIsPending(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: data.password,
      token,
    });

    setIsPending(false);

    if (resetError) {
      toast.error(
        getErrorFeedback(resetError, {
          fallbackMessage:
            "We could not reset your password. The link may have expired.",
        }).message,
      );
      return;
    }

    // The reset revokes existing sessions rather than creating one, so the
    // next step is a normal sign-in with the new password.
    toast.success("Your password has been reset. Sign in with it now.");
    form.reset();
    router.push("/signin");
  }

  return (
    <Card className="relative mt-8 w-full max-w-md gap-0 overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-black via-zinc-950 to-zinc-900/90 py-0 shadow-2xl shadow-black/40 backdrop-blur motion-safe:animate-[fade-up_600ms_ease-out]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_top,rgba(255,255,255,0.12),transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/45 to-transparent"
      />
      <CardHeader className="relative z-10 gap-2 border-b border-white/10 px-6 pb-6 pt-6">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isLinkUnusable
            ? "This link is no longer valid."
            : "Pick something you have not used here before."}
        </CardDescription>
      </CardHeader>

      {isLinkUnusable ? (
        <CardContent className="relative z-10 flex flex-col gap-4 px-6 py-6">
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
            Reset links expire an hour after they are sent and can only be used
            once. Request a new one and it will arrive in a moment.
          </p>
          <Button
            asChild
            className="h-11 w-full rounded-lg border border-white/15 bg-linear-to-b from-zinc-800 to-zinc-900 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:from-zinc-700 hover:to-zinc-800"
          >
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Button
            asChild
            variant="link"
            className="h-auto px-0 text-foreground/80 hover:text-foreground"
          >
            <Link href="/signin">Back to sign in</Link>
          </Button>
        </CardContent>
      ) : (
        <form id="form-reset-password" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="relative z-10 px-6 pb-4">
            <FieldGroup className="gap-4 py-4">
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="form-reset-password-password"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                    >
                      New password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-reset-password-password"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter a new password"
                      autoComplete="new-password"
                      type="password"
                      className="h-11 border-white/10 bg-black/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:ring-white/10"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="form-reset-password-confirm"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                    >
                      Confirm password
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-reset-password-confirm"
                      aria-invalid={fieldState.invalid}
                      placeholder="Repeat the new password"
                      autoComplete="new-password"
                      type="password"
                      className="h-11 border-white/10 bg-black/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:ring-white/10"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
          <CardFooter className="relative z-10 flex-col gap-3 border-t border-white/10 bg-black/45 px-6 pb-6 pt-5">
            <Button
              type="submit"
              form="form-reset-password"
              disabled={isPending}
              className="h-11 w-full rounded-lg border border-white/15 bg-linear-to-b from-zinc-800 to-zinc-900 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:from-zinc-700 hover:to-zinc-800"
            >
              {isPending ? "Saving..." : "Save new password"}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
