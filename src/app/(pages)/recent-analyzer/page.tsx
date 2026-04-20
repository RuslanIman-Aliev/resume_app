import RecentAnalysesList from "@/features/recent-analyzer/components/recent-analyses-list";

const RecentAnalyzerPage = () => {
  return (
    <div className="max-w-7xl mx-auto flex flex-col my-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
        Recent Analyses
      </h1>
      <p className="text-muted-foreground font-medium">
        Here are your recent resume analyses.
      </p>
      <RecentAnalysesList />
    </div>
  );
};

export default RecentAnalyzerPage;
