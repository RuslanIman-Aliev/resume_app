import { Header } from "@/components/nav-main";
import CTASection from "@/features/main-page/components/cta-section";
import FeatureSection from "@/features/main-page/components/feature-section";
import { Footer } from "@/features/main-page/components/footer";
import HeroSection from "@/features/main-page/components/hero-section";
import PricingSection from "@/features/main-page/components/pricing-section";
import StatsSection from "@/features/main-page/components/stats-section";
import TestimonialsSection from "@/features/main-page/components/testimonials-section";
import HowItWorksSection from "@/features/main-page/components/works-section";

const Page = () => {
  return (
    <div>
      <Header />
      <HeroSection />
      <StatsSection />
      <FeatureSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Page;
