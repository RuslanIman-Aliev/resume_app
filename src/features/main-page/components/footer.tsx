import { REPOSITORY_URL } from "@/features/main-page/constants";
import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Only routes that exist.
 *
 * The footer used to carry sixteen links, fourteen of which - /pricing, /blog,
 * /docs, /about, /privacy and the rest - had no page behind them and answered
 * 404. A footer is the cheapest thing for a visitor to test, so every entry
 * here has to resolve; sections the product does not have are simply absent
 * rather than linked to nothing.
 */
const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Analyzer", href: "/analyzer" },
    { label: "Tracker", href: "/tracker" },
  ],
  account: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My resumes", href: "/resumes" },
    { label: "Sign in", href: "/signin" },
    { label: "Create account", href: "/signup" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-2.5 mb-4 md:min-h-0"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                AI-Tailor
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your AI-powered job application assistant. A personal project,
              currently in beta and free to use.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-1 md:space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors md:inline md:min-h-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Account</h3>
            <ul className="space-y-1 md:space-y-3">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors md:inline md:min-h-0"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AI-Tailor. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {/* The one social link that leads somewhere real. The Twitter and
                LinkedIn icons pointed at twitter.com and linkedin.com - the
                sites, not a profile. */}
            <Link
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors md:min-h-0"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Source code on GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
