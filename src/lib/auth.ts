import { betterAuth, BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";
import { renderActionEmail, sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env.server";
import { logError } from "@/lib/logger";

const githubClientId = serverEnv.GITHUB_CLIENT_ID;
const githubClientSecret = serverEnv.GITHUB_CLIENT_SECRET;

const googleClientId = serverEnv.GOOGLE_CLIENT_ID;
const googleClientSecret = serverEnv.GOOGLE_CLIENT_SECRET;
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
  emailAndPassword: {
    enabled: true,
    /**
     * Recovery for accounts that only exist as email + password. Without it a
     * forgotten password is a lost account: connecting Google is possible only
     * from inside a session.
     *
     * `requireEmailVerification` stays off. Turning it on would lock out every
     * account created before verification existed, since none of them has
     * `emailVerified` set and there is no way for them to earn it retroactively.
     */
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = renderActionEmail({
        heading: "Reset your password",
        body: "Use the link below to choose a new password. It stops working in an hour.",
        actionLabel: "Choose a new password",
        actionUrl: url,
        footer:
          "If you did not ask for this, nothing has changed - you can ignore this email.",
      });

      await sendEmail({
        to: user.email,
        subject: "Reset your AI-Tailor password",
        html,
        text,
      });
    },
    // An hour is Better Auth's default and it is the right order of magnitude
    // here; stated explicitly because the email promises it.
    resetPasswordTokenExpiresIn: 3600,
  },
  emailVerification: {
    /**
     * Verification is sent but not enforced, which is what makes implicit
     * account linking reachable: Better Auth will only attach a Google identity
     * to a local account whose email is verified (`requireLocalEmailVerified`),
     * and until now `emailVerified` could never become true for anyone.
     */
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { html, text } = renderActionEmail({
        heading: "Confirm your email address",
        body: "Confirming your address lets you recover your account and connect Google to it later.",
        actionLabel: "Confirm my address",
        actionUrl: url,
        footer: "If you did not create an AI-Tailor account, ignore this email.",
      });

      try {
        await sendEmail({
          to: user.email,
          subject: "Confirm your AI-Tailor email address",
          html,
          text,
        });
      } catch (error) {
        // Sign-up already succeeded by the time this runs, and nothing gates
        // on `emailVerified` yet, so a mail provider having a bad day must not
        // turn a created account into a failed registration.
        logError("auth.sendVerificationEmail", error);
      }
    },
  },
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
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
