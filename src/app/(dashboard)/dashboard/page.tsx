import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto bg-background max-w-7xl text-center container pt-24 pb-20 md:pt-32 md:pb-28">
      <section>
        <div className="flex items-center justify-center">
          <Badge className="border-primary/30 bg-primary/10 text-primary text-sm rounded-full border p-3">
            Now with GPT-5 Integration
          </Badge>
        </div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mt-6">
          Land your dream <br /> job{" "}
          <span className="text-primary">3x faster</span> with AI
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground text-pretty mt-6 max-w-xl  mx-auto">
          AI-Tailor analyzes job descriptions, tailors your resume, and coaches
          you through every step of your job search journey.
        </p>
      </section>
    </div>
  );
};

export default Page;
