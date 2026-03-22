import AnalyzerInfo from "@/features/analyzer/components/analyzer-info";
import AnalyzerTabs from "@/features/analyzer/components/analyzer-tabs";

const AnalyzerPage = () => {
  return (
    <div>
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
