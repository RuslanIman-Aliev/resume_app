import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | AI-Tailor",
  description: "Request a link to reset your AI-Tailor password.",
};

const ForgotPasswordPage = async () => {
  await requireUnauth();
  return <ForgotPasswordForm />;
};

export default ForgotPasswordPage;
