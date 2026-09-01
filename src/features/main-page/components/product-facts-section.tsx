import { FileDown, FileUp, Github, PencilLine } from "lucide-react";

/**
 * What the product does, in place of what it used to claim.
 *
 * This band used to read "3x faster job placement", "89% interview success
 * rate", "50K+ jobs landed" and "4.9 average rating". None of those numbers
 * had a source: the project has no user base, no revenue and collects no
 * metrics, so there was nothing behind them to measure.
 *
 * Every line below is instead checkable by reading the code, and each one
 * names where:
 * - upload formats: `lib/resume-extraction.ts` and `api/uploadthing/core.ts`
 * - editing in place: `api/resume/save-docx/route.ts`
 * - PDF export: `api/resume/export-pdf/route.ts`
 * - free: there is no payment provider in the repository at all
 */
const facts = [
  {
    icon: FileUp,
    title: "PDF, DOCX and DOC in",
    description: "Upload the resume file you already send to recruiters.",
  },
  {
    icon: PencilLine,
    title: "Edited in the original file",
    description: "AI rewrites are applied to the document, not to a copy.",
  },
  {
    icon: FileDown,
    title: "DOCX or PDF out",
    description: "Download the tailored resume in either format.",
  },
  {
    icon: Github,
    title: "Free in beta, source public",
    description: "No billing anywhere in the product. Read the code yourself.",
  },
];

const ProductFactsSection = () => {
  return (
    <section
      aria-labelledby="product-facts-heading"
      className="border-y border-border/50 bg-card/30"
    >
      <div className="container mx-auto max-w-7xl px-4 py-10 md:py-12">
        <h2 id="product-facts-heading" className="sr-only">
          What AI-Tailor does today
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {facts.map((fact) => (
            <div
              key={fact.title}
              className="flex flex-col items-center text-center"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <fact.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground text-balance">
                {fact.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {fact.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductFactsSection;
