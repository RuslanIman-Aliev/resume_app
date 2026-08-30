import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";

/**
 * What the product charges for today, and what it does not.
 *
 * There is no billing in the codebase: no payment provider, no subscription,
 * no trial and no monthly quota - the only limits are per-minute rate limits.
 * So the free plan lists the features that genuinely exist and ship today, and
 * the two paid tiers are marked as planned with no call to action, instead of
 * "Start Free Trial" and "Contact Sales" buttons that both led to /signup.
 */
const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything the product does today",
    features: [
      "Resume scoring with ATS checks",
      "Job match analysis against any posting",
      "AI rewrite suggestions you can apply",
      "Application tracker and cover letters",
    ],
    cta: "Get Started",
    href: "/signup",
    planned: false,
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "Planned, not yet available",
    features: [
      "Higher analysis limits",
      "Resume version history",
      "Interview preparation",
      "Priority support",
    ],
    cta: "Coming soon",
    href: null,
    planned: true,
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "planned",
    description: "Planned, not yet available",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "SSO & advanced security",
      "API access",
    ],
    cta: "Coming soon",
    href: null,
    planned: true,
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section
      id="pricing"
      className="w-full bg-background text-center py-12 md:py-20 border-y border-border/50 "
    >
      <div className="px-4 sm:px-6 xl:px-0 max-w-7xl mx-auto container">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold  tracking-tight text-foreground ">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto text-pretty">
            Everything is free while the product is in beta. Paid tiers are on
            the roadmap, not on the invoice.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-8 md:mt-14 max-w-5xl mx-auto">
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
                    Available now
                  </Badge>
                )}
                {plan.planned && (
                  <Badge
                    variant="outline"
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-background"
                  >
                    Planned
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
                  {plan.href ? (
                    <Button className="w-full h-11 md:h-8" asChild>
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-11 md:h-8"
                      variant="outline"
                      disabled
                    >
                      {plan.cta}
                    </Button>
                  )}
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
