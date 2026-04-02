import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 job analyses per month",
      "Basic resume scoring",
      "ATS compatibility check",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "For serious job seekers",
    features: [
      "Unlimited job analyses",
      "AI resume tailoring",
      "Advanced ATS optimization",
      "Application tracker",
      "AI career coach",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For teams and recruiters",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Custom integrations",
      "Dedicated account manager",
      "SSO & advanced security",
      "API access",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section className="w-full bg-background text-center  border-y border-border/50 ">
      <div className=" max-w-7xl mx-auto container">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold  tracking-tight text-foreground ">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto text-pretty">
            Start for free, upgrade when you&apos;re ready
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-16 mb-20 md:mb-28 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-visible flex flex-col h-full border   ${
                plan.highlighted
                  ? "border-primary bg-card shadow-lg shadow-primary/10"
                  : "bg-card/50 border-border/50"
              } `}
            >
              <CardHeader className="space-y-2">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    Most Popular
                  </Badge>
                )}
                <p className="text-muted-foreground">{plan.description}</p>
                <p className="text-2xl font-bold">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>{" "}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{plan.period}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="text-left flex flex-col h-full pt-4">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link href="/sign-up" className="block">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
