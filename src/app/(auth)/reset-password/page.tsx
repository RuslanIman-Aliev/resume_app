import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose a New Password | AI-Tailor",
  description: "Set a new password for your AI-Tailor account.",
};

/**
 * Landing page for the emailed reset link.
 *
 * Better Auth exchanges the link for a token first and redirects here as
 * `/reset-password?token=...`, or `?error=INVALID_TOKEN` when the link expired
 * or was already used.
 */
const ResetPasswordPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) => {
  await requireUnauth();
  const { token, error } = await searchParams;

  return (
    <ResetPasswordForm
      token={typeof token === "string" ? token : undefined}
      error={typeof error === "string" ? error : undefined}
    />
  );
};

export default ResetPasswordPage;
