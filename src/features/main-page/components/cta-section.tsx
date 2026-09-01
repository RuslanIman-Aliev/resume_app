import { Button } from "@/components/ui/button";
import { REPOSITORY_URL } from "@/features/main-page/constants";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CTASection = () => {
  return (
    <section className="w-full px-4 sm:px-6 xl:px-0 py-12 md:py-20">
      <div className="max-w-7xl mx-auto container overflow-hidden rounded-2xl bg-primary/10 border border-primary/20  text-center py-15 ">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-75 bg-primary/30 rounded-full blur-[100px] opacity-50" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground max-w-2xl mx-auto text-balance">
          Ready to accelerate your job search?
        </h2>
        {/* Was "Join 50,000+ job seekers who've landed their dream jobs with
            AI-Tailor." The product has no users to count, so the line now says
            what signing up actually costs and gets you. */}
        <p className="text-lg md:text-xl text-muted-foreground text-pretty mt-2 max-w-xl  mx-auto">
          Upload a resume, paste a job posting, and get a tailored draft back in
          the same file format.
        </p>
        <div className="mt-5 flex flex-col  items-center justify-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/signup">
                Create a free account
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
            No credit card required. Free while the product is in beta.{" "}
            <Link
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
            >
              Source on GitHub
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
