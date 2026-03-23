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
import {
  SignInFormData,
  signInFormSchema,
  type SignUpFormData,
} from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export function SignInForm() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
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
        onRequest: (ctx) => {
          setIsPending(true);
        },
        onSuccess: (ctx) => {
          setIsPending(false);
          toast.success("Sign in successful!");
          form.reset();
          router.push("/dashboard");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || "An error occurred during sign in.");
          setIsPending(false);
        },
      },
    );
  }

  return (
    <Card className="w-full  justify-center max-w-md">
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>
          Enter your information below to sign in to your account
        </CardDescription>
        <CardAction>
          <Button variant="link">Sign Up</Button>
        </CardAction>
      </CardHeader>
      <form id="form-signin" onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-signin-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="form-signin-email"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your email"
                    autoComplete="off"
                    type="email"
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
                  <FieldLabel htmlFor="form-signin-password">
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-signin-password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your password"
                    autoComplete="off"
                    type="password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            form="form-signin"
            disabled={isPending}
          >
            {isPending ? "Signing In..." : "Sign In"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            type="button"
          >
            Sign In with Google
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
