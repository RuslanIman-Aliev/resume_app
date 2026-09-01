import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REPOSITORY_URL } from "@/features/main-page/constants";
import { ArrowDown, ArrowRight, Github } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <section className="px-4 sm:px-6 xl:px-0 pt-20 pb-12 md:pt-32 md:pb-20 max-w-7xl mx-auto container bg-background  text-center ">
      <div className="flex items-center justify-center">
        {/* States the project's status up front. Anyone reading this page from
            a CV link finds out what they are looking at before they scroll,
            rather than after they go looking for a company behind it. */}
        <Badge className="border-primary/30 bg-primary/10 text-primary text-sm rounded-full border p-3">
          Beta &middot; a personal project, free to use
        </Badge>
      </div>
      {/* Was "Land your dream job 3x faster with AI". The 3x was invented -
          nothing in the product measures placement speed, and there are no
          users to measure. What is left describes what the product does. */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mt-6">
        Tailor your resume to{" "}
        <br className="hidden sm:inline" /> every job{" "}
        <span className="text-primary">with AI</span>
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
      {/* With no users, ratings or press to point at, the source is the only
          substantiation this page has - so it sits in the hero, not only in
          the footer. */}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors md:min-h-0"
        >
          <Github aria-hidden="true" className="h-4 w-4" />
          Read the source on GitHub
        </Link>
      </p>
    </section>
  );
};

export default HeroSection;
