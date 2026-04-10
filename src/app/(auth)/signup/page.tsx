import { SignUpForm } from "@/features/auth/components/signup-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | AI-Tailor",
  description: "Create an AI-Tailor account and start optimizing your resume.",
};

const SignUpPage = async () => {
  await requireUnauth();
  return <SignUpForm />;
};

export default SignUpPage;
