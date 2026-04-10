import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-tailor.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/resumes",
          "/tracker",
          "/ai-coach",
          "/analyzer",
          "/signin",
          "/signup",
          "/sentry-example-page",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
