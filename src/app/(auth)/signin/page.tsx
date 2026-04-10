import { SignInForm } from "@/features/auth/components/signin-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | AI-Tailor",
  description: "Sign in to your AI-Tailor account.",
};

const SignInPage = async () => {
  await requireUnauth();
  return <SignInForm />;
};

export default SignInPage;
