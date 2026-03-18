import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "I landed my dream job at a FAANG company after using AI-Tailor for just 2 weeks. The resume optimization was a game-changer.",
    author: "Sarah Chen",
    role: "Software Engineer at Google",
    initials: "SC",
  },
  {
    quote:
      "The AI coach helped me identify gaps in my resume I never knew existed. My interview callback rate went from 10% to 60%.",
    author: "Marcus Johnson",
    role: "Product Manager at Stripe",
    initials: "MJ",
  },
  {
    quote:
      "As a career changer, tailoring my resume for each application was overwhelming. AI-Tailor made it effortless.",
    author: "Emily Rodriguez",
    role: "UX Designer at Airbnb",
    initials: "ER",
  },
];

const TestimonialsSection = () => {
  return (
    <section className=" max-w-7xl mx-auto container bg-background  text-center  py-20 md:py-26">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold  tracking-tight text-foreground ">
          Loved by job seekers everywhere
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto text-pretty">
          Join thousands who&apos;ve accelerated their job search with
          AI-Tailor.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-16 ">
        {testimonials.map((testimonial, index) => (
          <Card key={index} className="h-full flex flex-col">
            <CardContent className="text-left flex flex-col h-full">
              <div className="flex mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground my-4 max-w-75">
                &quot;{testimonial.quote}&quot;
              </p>

              <div className="mt-auto flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-sm">
                    {testimonial.author}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {testimonial.role}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default TestimonialsSection;
