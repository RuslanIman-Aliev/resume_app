import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { REPOSITORY_URL } from "@/features/main-page/constants";
import { Check, Clock, Github } from "lucide-react";
import Link from "next/link";

/**
 * Where the project actually stands, in place of who supposedly loves it.
 *
 * This slot used to hold three testimonials - "Sarah Chen, Software Engineer
 * at Google" and two others - each with a five-star rating and a callback-rate
 * figure. The people did not exist, and neither did the ratings.
 *
 * The audience for this page is recruiters and engineers reading a CV link,
 * and for them a stated project status plus a link to the source is both the
 * honest answer and the stronger one. The three-column shape is kept so the
 * page still reads as designed rather than as something with a hole in it.
 */
const shipped = [
  "Resume upload with text extraction (PDF, DOCX, DOC)",
  "Resume scoring with ATS checks",
  "Job match analysis against a pasted posting",
  "AI rewrites applied in the document editor",
  "DOCX and PDF download of the edited resume",
  "Cover letter drafts generated with each analysis",
  "Application tracker for every role you apply to",
];

const planned = [
  "Resume version history",
  "Interview preparation in the AI coach",
  "Higher analysis limits on a paid tier",
  "Team features and API access",
];

const ProjectStatusSection = () => {
  return (
    <section
      aria-labelledby="project-status-heading"
      className="px-4 sm:px-6 xl:px-0 max-w-7xl mx-auto container bg-background text-center py-12 md:py-20"
    >
      <div>
        <h2
          id="project-status-heading"
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
        >
          Where the project stands
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
          AI-Tailor is a personal project, built and maintained by one
          developer. It is in beta and has no user base yet, so here is what it
          does instead.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-8 md:mt-14">
        <Card className="h-full flex flex-col">
          <CardHeader className="text-left">
            <h3 className="text-lg font-bold text-foreground">
              Working today
            </h3>
            <p className="text-sm text-muted-foreground">
              Features you can use right now, for free.
            </p>
          </CardHeader>
          <CardContent className="text-left flex flex-col h-full">
            <ul className="space-y-3">
              {shipped.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 mt-0.5 text-primary shrink-0"
                  />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader className="text-left">
            <h3 className="text-lg font-bold text-foreground">On the way</h3>
            <p className="text-sm text-muted-foreground">
              Planned, not built yet. Nothing here is billed.
            </p>
          </CardHeader>
          <CardContent className="text-left flex flex-col h-full">
            <ul className="space-y-3">
              {planned.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Clock
                    aria-hidden="true"
                    className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
                  />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col border-primary/30 bg-primary/5">
          <CardHeader className="text-left">
            <h3 className="text-lg font-bold text-foreground">
              Built in the open
            </h3>
            <p className="text-sm text-muted-foreground">
              The best evidence this project can offer.
            </p>
          </CardHeader>
          <CardContent className="text-left flex flex-col h-full">
            <p className="text-sm text-muted-foreground">
              No user numbers, no ratings and no case studies, because there are
              none to report yet. What there is: a Next.js 16 codebase with
              typed tRPC endpoints, background analysis jobs, and lint,
              typecheck, unit and end-to-end tests running on every push.
            </p>
            <div className="mt-auto pt-6">
              <Button className="w-full h-11 md:h-9" asChild>
                <Link
                  href={REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github aria-hidden="true" className="mr-2 h-4 w-4" />
                  Read the source on GitHub
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ProjectStatusSection;
