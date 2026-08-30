"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  authClient,
  getOAuthErrorMessage,
  signInWithGoogle,
} from "@/lib/auth-client";
import { getErrorFeedback } from "@/lib/error-feedback";
import { SignInFormData, signInFormSchema } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignInForm({ oauthError }: { oauthError?: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  // `account_not_linked` gets a persistent hint below instead of a toast, since
  // it asks the user to do something rather than just reporting a failure.
  const isNotLinked = oauthError === "account_not_linked";

  // Better Auth redirects failed social sign-ins back here as `?error=<code>`.
  useEffect(() => {
    if (!oauthError || isNotLinked) return;
    toast.error(getOAuthErrorMessage(oauthError));
    router.replace("/signin");
  }, [oauthError, isNotLinked, router]);
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignInFormData) {
    await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
      },
      {
        onRequest: () => {
          setIsPending(true);
        },
        onSuccess: () => {
          setIsPending(false);
          toast.success("Sign in successful!");
          form.reset();
          router.push("/dashboard");
        },
        onError: (ctx) => {
          toast.error(
            getErrorFeedback(ctx.error, {
              fallbackMessage: "An error occurred during sign in.",
            }).message,
          );
          setIsPending(false);
        },
      },
    );
  }

  async function onGoogleSignIn() {
    setIsPending(true);

    const { error } = await signInWithGoogle({ errorCallbackURL: "/signin" });

    if (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "An error occurred during Google sign in.",
        }).message,
      );
      setIsPending(false);
    }
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-35%] top-[-20%] h-44 bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.12)_50%,transparent_65%)] opacity-30 blur-xl motion-safe:animate-[shimmer_8s_ease-in-out_infinite]"
      />
      <CardHeader className="relative z-10 gap-2 border-b border-white/10 px-6 pb-6 pt-6">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Sign in to your account
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your information below to sign in to your account
        </CardDescription>
        <CardAction className="self-start">
          <Button
            variant="link"
            className="h-auto px-0 text-foreground/80 hover:text-foreground"
            onClick={() => router.push("/signup")}
            type="button"
          >
            Sign Up
          </Button>
        </CardAction>
      </CardHeader>
      <form id="form-signin" onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="relative z-10 px-6 pb-4">
          {isNotLinked && (
            <p className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
              An account with this email already exists. Sign in with your
              password below, then connect Google under Settings.
            </p>
          )}
          <FieldGroup className="gap-4 py-4">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="form-signin-email"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                  >
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signin-email"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your email"
                    autoComplete="off"
                    type="email"
                    className="h-11 border-white/10 bg-black/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:ring-white/10"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel
                      htmlFor="form-signin-password"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                    >
                      Password
                    </FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    {...field}
                    id="form-signin-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your password"
                    autoComplete="off"
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
            className="relative h-11 w-full overflow-hidden rounded-lg border border-white/15 bg-linear-to-b from-zinc-800 to-zinc-900 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:from-zinc-700 hover:to-zinc-800"
            form="form-signin"
            disabled={isPending}
          >
            <span className="relative z-10">
              {isPending ? "Signing In..." : "Sign In"}
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover/button:opacity-70 motion-safe:group-hover/button:animate-[shimmer_1.8s_ease-in-out]"
            />
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full border-white/10 bg-black/55 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-zinc-900"
            disabled={isPending}
            type="button"
            onClick={onGoogleSignIn}
          >
            Sign In with Google
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
