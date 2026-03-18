import { Card, CardContent } from "@/components/ui/card";
import { Brain, FileText, LineChart, Shield, Zap, Target } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Job Description Analyzer",
    description:
      "Paste any job description and instantly extract key requirements, skills, and keywords that matter most.",
  },
  {
    icon: Brain,
    title: "AI Resume Tailoring",
    description:
      "Automatically customize your resume for each job application with AI-powered suggestions and rewrites.",
  },
  {
    icon: Target,
    title: "ATS Optimization",
    description:
      "Ensure your resume passes Applicant Tracking Systems with keyword matching and format optimization.",
  },
  {
    icon: LineChart,
    title: "Application Tracker",
    description:
      "Keep track of all your applications, interviews, and follow-ups in one organized dashboard.",
  },
  {
    icon: Shield,
    title: "AI Career Coach",
    description:
      "Get personalized advice on improving your resume, cover letters, and interview preparation.",
  },
  {
    icon: Zap,
    title: "Instant Match Score",
    description:
      "See how well your resume matches each job posting and get actionable improvement tips.",
  },
];

const FeatureSection = () => {
  return (
    <section className=" max-w-7xl mx-auto container bg-background  text-center  ">
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold  tracking-tight text-foreground mt-6">
        Everything you need to land your next role
      </h2>
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
        Powerful AI tools designed to give you an unfair advantage in your job
        search.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6  mt-16 mb-20 md:mb-28">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="bg-card/50 border border-border/50 hover:border-primary/30 transition-colors text-left p-6 rounded-lg"
          >
            <CardContent>
              <div className="flex items-center justify-center w-12 rounded-lg h-12 bg-primary/10 my-5">
                <feature.icon className="h-6 w-6 text-primary " />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeatureSection;
