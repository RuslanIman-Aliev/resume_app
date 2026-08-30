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
import { ForgotPasswordFormData, forgotPasswordFormSchema } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [isPending, setIsPending] = useState(false);
  // The address the request was made for, and the signal that it went through.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsPending(true);

    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      // Where Better Auth sends the browser once the emailed link has been
      // exchanged for a token. Relative on purpose: an absolute URL would have
      // to match a trusted origin exactly, and the app is reached under more
      // than one host name.
      redirectTo: "/reset-password",
    });

    setIsPending(false);

    if (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "We could not send the reset link. Please try again.",
        }).message,
      );
      return;
    }

    // Deliberately the same outcome whether or not the address has an account:
    // a different message here would turn this form into a way to test which
    // emails are registered.
    setSentTo(data.email);
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
          Reset your password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {sentTo
            ? "Check your inbox for the link."
            : "Enter your email and we will send you a link to choose a new one."}
        </CardDescription>
      </CardHeader>

      {sentTo ? (
        <CardContent className="relative z-10 flex flex-col gap-4 px-6 py-6">
          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="text-foreground">{sentTo}</span>, a reset link is on
            its way. The link works for one hour.
          </p>
          <Button
            variant="outline"
            className="h-11 w-full border-white/10 bg-black/55 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-zinc-900"
            onClick={() => {
              setSentTo(null);
              form.reset();
            }}
            type="button"
          >
            Send to a different address
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
        <form id="form-forgot-password" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="relative z-10 px-6 pb-4">
            <FieldGroup className="gap-4 py-4">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                      htmlFor="form-forgot-password-email"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                    >
                      Email
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-forgot-password-email"
                      aria-invalid={fieldState.invalid}
                      placeholder="Enter your email"
                      autoComplete="email"
                      type="email"
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
              form="form-forgot-password"
              disabled={isPending}
              className="h-11 w-full rounded-lg border border-white/15 bg-linear-to-b from-zinc-800 to-zinc-900 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:from-zinc-700 hover:to-zinc-800"
            >
              {isPending ? "Sending..." : "Send reset link"}
            </Button>
            <Button
              asChild
              variant="link"
              className="h-auto px-0 text-foreground/80 hover:text-foreground"
            >
              <Link href="/signin">Back to sign in</Link>
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
