import { Header } from "@/components/nav-main";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full">
      <Header activePage="dashboard" />
      {children}
    </main>
  );
}
