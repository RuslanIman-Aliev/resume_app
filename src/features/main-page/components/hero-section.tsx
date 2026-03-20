import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="pb-20 md:pt-32 md:pb-28 max-w-7xl mx-auto container bg-background  text-center ">
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
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button size="lg" className="h-12 px-8 text-base" asChild>
          <Link href="/signup">
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>

        <Button variant="outline" size="lg" className="h-12 px-8 text-base">
          <Play className="mr-2 h-4 w-4" />
          Watch Demo
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
