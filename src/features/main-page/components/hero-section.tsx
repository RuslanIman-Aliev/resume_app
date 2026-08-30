import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="px-4 sm:px-6 xl:px-0 pt-20 pb-12 md:pt-32 md:pb-20 max-w-7xl mx-auto container bg-background  text-center ">
      <div className="flex items-center justify-center">
        <Badge className="border-primary/30 bg-primary/10 text-primary text-sm rounded-full border p-3">
          Now with GPT-5 Integration
        </Badge>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mt-6">
        Land your dream <br className="hidden sm:inline" /> job{" "}
        <span className="text-primary">3x faster</span> with AI
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground text-pretty mt-6 max-w-xl  mx-auto">
        AI-Tailor analyzes job descriptions, tailors your resume, and coaches
        you through every step of your job search journey.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* "Start Free Trial" promised a trial that does not exist - the
            product is free, with no billing anywhere in the code. */}
        <Button size="lg" className="h-12 px-8 text-base" asChild>
          <Link href="/signup">
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>

        {/* Was a "Watch Demo" button with no onClick, no href and no video
            behind it. It now goes to the section that actually explains the
            product. */}
        <Button
          variant="outline"
          size="lg"
          className="h-12 px-8 text-base"
          asChild
        >
          <Link href="/#features">
            <ArrowDown className="mr-2 h-4 w-4" />
            See how it works
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
