import ApplicationPipeline from "@/features/dashboard/components/application-pipeline";
import MainInfo from "@/features/dashboard/components/main-info";
import QuickActions from "@/features/dashboard/components/quick-actions";
import RecentAnalyses from "@/features/dashboard/components/recent-analyses";
import UpcomingInterviews from "@/features/dashboard/components/upcoming-interviews";

const Page = () => {
  return (
    <div>
      <section className="container max-w-7xl mx-auto pt-10">
        <MainInfo />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ApplicationPipeline />
            <RecentAnalyses />
          </div>

          <div className="space-y-6">
            <QuickActions />
            <UpcomingInterviews />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Page;
