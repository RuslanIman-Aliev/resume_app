const steps = [
  {
    number: "01",
    title: "Paste the job description",
    description:
      "Copy and paste any job posting into our analyzer. We support all formats and sources.",
  },
  {
    number: "02",
    title: "Get instant analysis",
    description:
      "Our AI extracts key requirements, skills, and keywords in seconds.",
  },
  {
    number: "03",
    title: "Tailor your resume",
    description:
      "Use AI suggestions to customize your resume for maximum impact.",
  },
  {
    number: "04",
    title: "Track and apply",
    description: "Submit your optimized application and track your progress.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="w-full text-center py-20 md:py-26  border-y border-border/50 bg-card/30 ">
      <div className="mx-auto  max-w-7xl container ">
        <div className="mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold  tracking-tight text-foreground ">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
            From job posting to application in minutes, not hours.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 ">
          {steps.map((step, index) => (
            <div key={index} className="relative text-left">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-px bg-border/50" />
              )}
              <div className="relative ">
                <span className="text-5xl font-bold text-primary/20">
                  {step.number}
                </span>

                <h3 className="text-lg font-bold text-foreground my-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
