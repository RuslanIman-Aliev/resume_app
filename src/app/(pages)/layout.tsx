import { Header } from "@/components/nav-main";
import { requireAuth } from "@/lib/auth-utils";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <main className="w-full">
      <Header/>
      {children}
    </main>
  );
}
