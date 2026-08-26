import { Badge } from "@/components/ui/badge";

const AnalyzerLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex w-full flex-1 flex-col my-6">
      <section className="max-w-7xl mx-auto flex shrink-0 flex-col items-center px-4 py-6 sm:px-6 sm:py-10 xl:px-0">
        <div className="flex items-center justify-center">
          <Badge className="border-primary/30 bg-primary/10 text-primary text-sm rounded-full border p-3">
            AI-Powered Analysis
          </Badge>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance mt-4">
          Job Description Analyzer
        </h1>
      </section>

      <div className="flex-1 min-h-0">{children}</div>
    </main>
  );
};

export default AnalyzerLayout;
