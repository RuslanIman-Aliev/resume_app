import { Header } from "@/components/nav-main";
import CTASection from "@/features/main-page/components/cta-section";
import FeatureSection from "@/features/main-page/components/feature-section";
import { Footer } from "@/features/main-page/components/footer";
import HeroSection from "@/features/main-page/components/hero-section";
import PricingSection from "@/features/main-page/components/pricing-section";
import ProductFactsSection from "@/features/main-page/components/product-facts-section";
import ProjectStatusSection from "@/features/main-page/components/project-status-section";
import HowItWorksSection from "@/features/main-page/components/works-section";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-tailor.app";
const pageTitle = "AI-Tailor — AI Resume Tailoring & Job Tracker";
const pageDescription =
  "AI-Tailor analyzes job descriptions, tailors your resume, and tracks applications with AI coaching.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: pageTitle,
    description: pageDescription,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "AI-Tailor",
      url: siteUrl,
    },
    {
      "@type": "WebSite",
      name: "AI-Tailor",
      url: siteUrl,
      description: pageDescription,
    },
  ],
};

const Page = () => {
  return (
    <div>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <HeroSection />
        <ProductFactsSection />
        <FeatureSection />
        <HowItWorksSection />
        <ProjectStatusSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Page;
