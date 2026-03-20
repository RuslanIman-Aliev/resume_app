import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CTASection = () => {
  return (
    <section className="w-full">
      <div className="mb-20 md:mt-32 md:mb-28 max-w-7xl mx-auto container overflow-hidden rounded-2xl bg-primary/10 border border-primary/20  text-center py-15 ">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-75 bg-primary/30 rounded-full blur-[100px] opacity-50" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground max-w-2xl mx-auto text-balance">
          Ready to accelerate your job search?
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground text-pretty mt-2 max-w-xl  mx-auto">
          Join 50,000+ job seekers who&apos;ve landed their dream jobs with
          AI-Tailor.
        </p>
        <div className="mt-5 flex flex-col  items-center justify-center gap-4">
          <div className="flex flex-row gap-5">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
              asChild
            >
              <Link href="/analyzer">Try the Analyzer</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-pretty mt-2 max-w-xl">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
