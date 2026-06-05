import type { Metadata } from "next";
import { Header } from "@/components/nav-main";
import { requireAuth } from "@/lib/auth-utils";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return (
    <main className="flex min-h-screen w-full flex-col">
      <Header />
      <div className="flex-1 min-h-0">{children}</div>
    </main>
  );
}
