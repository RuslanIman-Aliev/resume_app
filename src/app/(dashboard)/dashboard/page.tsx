import { ChartTokenRemaining } from "@/features/dashboard/components/chart-remaining-tokens";

const Page = () => {
  return (
    <div className="p-8 w-full flex justify-center items-center h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">

        <div className="bg-card rounded-xl border border-muted p-6">
          <ChartTokenRemaining />
        </div>
        <div className="bg-card rounded-xl border border-muted p-6">
          Quick Actions
        </div>
        <div className="bg-card rounded-xl border border-muted p-6">
          Current Resume
        </div>

        <div className="md:col-span-2 bg-card rounded-xl border border-muted p-6">
          Recent Applications
        </div>

        <div className="bg-card rounded-xl border border-muted p-6">
          Match Score Trend
        </div>
      </div>
    </div>
  );
};

export default Page;
