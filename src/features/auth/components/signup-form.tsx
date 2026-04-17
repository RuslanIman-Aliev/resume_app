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
import { authClient } from "@/lib/auth-client";
import { signUpFormSchema, type SignUpFormData } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignUpForm() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignUpFormData) {
    await authClient.signUp.email(
      {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      {
        onRequest: () => {
          setIsPending(true);
        },
        onSuccess: () => {
          setIsPending(false);
          toast.success("Sign up successful!");
          form.reset();
          router.push("/dashboard");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || "An error occurred during sign up.");
          setIsPending(false);
        },
      },
    );
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
          Sign up for an account
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your information below to create your account
        </CardDescription>
        <CardAction className="self-start">
          <Button
            variant="link"
            className="h-auto px-0 text-foreground/80 hover:text-foreground"
            onClick={() => router.push("/signin")}
            type="button"
          >
            Sign In
          </Button>
        </CardAction>
      </CardHeader>
      <form id="form-signup" onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="relative z-10 px-6 pb-4">
          <FieldGroup className="gap-4 pt-5">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="form-signup-name"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                  >
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signup-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your name"
                    autoComplete="off"
                    className="h-11 border-white/10 bg-black/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:border-white/25 focus-visible:ring-white/10"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="form-signup-email"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                  >
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signup-email"
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
                  <FieldLabel
                    htmlFor="form-signup-password"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                  >
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signup-password"
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

            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="form-signup-confirmPassword"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80"
                  >
                    Confirm Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signup-confirmPassword"
                    aria-invalid={fieldState.invalid}
                    placeholder="Confirm your password"
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
            form="form-signup"
            disabled={isPending}
          >
            <span className="relative z-10">
              {isPending ? "Creating Account..." : "Sign Up"}
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
          >
            Sign Up with Google
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
