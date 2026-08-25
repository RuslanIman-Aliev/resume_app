import { betterAuth, BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};

if (githubClientId && githubClientSecret) {
  socialProviders.github = {
    clientId: githubClientId,
    clientSecret: githubClientSecret,
  };
}

if (googleClientId && googleClientSecret) {
  socialProviders.google = {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders,
  account: {
    accountLinking: {
      // Sign in with a social provider attaches to the existing user that owns
      // the same email instead of failing with `account_not_linked`.
      enabled: true,
      // Google vouches for the mailbox, so its `email_verified` claim is taken
      // as proof of ownership. GitHub is left untrusted on purpose: it reports
      // unverified emails too, and those must not be treated as proof.
      trustedProviders: ["google"],
      // `requireLocalEmailVerified` stays at its secure default (true): a local
      // email/password row still has to be verified before an OAuth identity
      // can be linked into it, otherwise anyone could pre-register someone
      // else's email and inherit their Google login.
    },
  },
});
