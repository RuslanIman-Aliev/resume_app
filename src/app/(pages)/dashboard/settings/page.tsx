import { ConnectedAccounts } from "@/features/auth/components/connected-accounts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | AI-Tailor",
  description: "Manage your AI-Tailor account and connected sign-in providers.",
};

const SettingsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) => {
  const { error } = await searchParams;

  return (
    <section className="container mx-auto max-w-3xl px-4 pb-16 pt-10">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <div className="mt-8">
        <ConnectedAccounts
          oauthError={typeof error === "string" ? error : undefined}
        />
      </div>
    </section>
  );
};

export default SettingsPage;
