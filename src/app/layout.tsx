import "@/app/globals.css";
import "@/lib/env.server";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-tailor.app";
const siteTitle = "AI-Tailor — AI Resume Tailoring & Job Tracker";
const siteDescription =
  "AI-Tailor analyzes job descriptions, tailors your resume, and tracks applications with AI coaching.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s — AI-Tailor",
  },
  description: siteDescription,
  applicationName: "AI-Tailor",
  keywords: [
    "AI resume",
    "resume tailoring",
    "ATS optimization",
    "job application tracker",
    "career coach",
    "resume analysis",
  ],
  authors: [{ name: "AI-Tailor" }],
  creator: "AI-Tailor",
  publisher: "AI-Tailor",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "AI-Tailor",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${manrope.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SpeedInsights />
          <Analytics />
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
