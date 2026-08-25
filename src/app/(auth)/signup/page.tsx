import { SignUpForm } from "@/features/auth/components/signup-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | AI-Tailor",
  description: "Create an AI-Tailor account and start optimizing your resume.",
};

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) => {
  await requireUnauth();
  const { error } = await searchParams;
  return (
    <SignUpForm oauthError={typeof error === "string" ? error : undefined} />
  );
};

export default SignUpPage;
