import { Button } from "@/components/ui/button";
import { ChartTokenRemaining } from "@/features/dashboard/components/chart-remaining-tokens";
import { ChartSuccessRate } from "@/features/dashboard/components/chart-success-rate";
import { FileText } from "lucide-react";

const recentApplications = [
  { company: "Siemens", date: "16/02/2026", score: 88 },
  { company: "Spotify", date: "24/03/2026", score: 92 },
  { company: "Zalando", date: "24/11/2026", score: 75 },
];

const Page = () => {
  return (
    <div className="p-8 w-full flex justify-center items-center h-screen">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
        <div className="bg-card rounded-xl border border-muted p-6">
          <ChartTokenRemaining />
        </div>
        <div className="bg-card rounded-xl border border-muted p-6 relative flex flex-col overflow-hidden">
          <div className="absolute top-1/5 left-1/4 w-75 h-75 bg-teal-500/20 rounded-full blur-[100px]" />
          <div className="absolute top-1 right-1/4 w-75 h-75   bg-purple-500/30 rounded-full blur-[100px]" />
          <h3 className="font-semibold text-lg mb-4 relative z-10">
            Quick Actions
          </h3>

          <div className="flex-1 flex items-center justify-center relative z-10">
            <div className="w-full p-[1px] rounded-md bg-gradient-to-r from-purple-500 to-teal-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(20,184,166,0.3)] transition-all duration-300 cursor-pointer">
              <Button
                variant="ghost"
                className="w-full h-12 bg-card hover:bg-transparent text-foreground rounded-[5px] font-medium cursor-pointer"
              >
                Create New Tailored Application
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-muted p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Current Resume</h3>

          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-2">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500/10 to-teal-500/10 border border-muted shadow-sm">
              <FileText className="h-10 w-10 text-teal-400" />
              <div className="absolute -bottom-2 -right-2 rounded-md bg-purple-600 px-2 py-1 text-[10px] font-bold text-white shadow-md tracking-wider">
                PDF
              </div>
            </div>

            <div>
              <p className="font-medium text-foreground">
                Aleksei_TS_Resume.pdf
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded: Mar 14, 2026
              </p>
            </div>

            <div className="flex w-full gap-3 mt-2">
              <Button
                variant="outline"
                className="w-full text-xs h-8 cursor-pointer"
              >
                View
              </Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-card rounded-xl border border-muted p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-6">Recent Applications</h3>

          <div className="w-full flex-1">
            <div className="grid grid-cols-3 text-sm font-medium text-muted-foreground mb-4 pb-2 border-b border-muted">
              <div>Company Name</div>
              <div>Date</div>
              <div className="text-right">Match Score</div>
            </div>

            <div className="flex flex-col gap-5">
              {recentApplications.map((app, index) => (
                <div
                  key={index}
                  className="grid grid-cols-3 items-center text-sm"
                >
                  <div className="font-medium text-foreground">
                    {app.company}
                  </div>
                  <div className="text-muted-foreground">{app.date}</div>

                  <div className="flex items-center justify-end gap-3">
                    <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-teal-400 rounded-full"
                        style={{ width: `${app.score}%` }}
                      />
                    </div>
                    <span className="font-medium w-8 text-right">
                      {app.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-muted p-6">
          <ChartSuccessRate />
        </div>
      </div>
    </div>
  );
};

export default Page;
