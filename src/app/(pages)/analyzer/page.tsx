import { Badge } from "@/components/ui/badge";
import AnalyzerInfo from "@/features/analyzer/components/analyzer-info";
import AnalyzerTabs from "@/features/analyzer/components/analyzer-tabs";

const AnalyzerPage = () => {
  return (
    <div>
      <section className="max-w-7xl mx-auto flex flex-col items-center py-10">
        <div className="flex items-center justify-center">
          <Badge className="border-primary/30 bg-primary/10 text-primary text-sm rounded-full border p-3">
            AI-Powered Analysis
          </Badge>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance mt-4">
          Job Description Analyzer
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-xl mx-auto text-pretty">
          Paste any job description and let AI extract key requirements, skills,
          and keywords to help you tailor your resume for maximum impact.
        </p>
      </section>

      <section className="max-w-7xl grid grid-cols-3 gap-6 mx-auto">
        <div className="col-span-2">
          <AnalyzerTabs />
        </div>
        <AnalyzerInfo />
      </section>
    </div>
  );
};

export default AnalyzerPage;
