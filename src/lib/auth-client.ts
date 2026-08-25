import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});

type SocialSignInOptions = {
  /** Where Better Auth sends the browser after a successful Google callback. */
  callbackURL?: string;
  /** Where the browser lands when Google or the callback handler fails. */
  errorCallbackURL?: string;
};

/**
 * Starts the Google OAuth redirect flow.
 *
 * On success the browser is redirected to Google, so nothing after the await
 * runs; only a failure to *start* the flow (e.g. provider not configured)
 * resolves with `error`, which callers should surface to the user.
 */
export const signInWithGoogle = async ({
  callbackURL = "/dashboard",
  errorCallbackURL = "/signin",
}: SocialSignInOptions = {}) =>
  authClient.signIn.social({
    provider: "google",
    callbackURL,
    errorCallbackURL,
  });

/**
 * Attaches Google to the user who is *already signed in*.
 *
 * Unlike implicit linking during sign-in, this path takes the session itself as
 * proof that the caller owns the local account, so it works even when that
 * account's email was never verified. Same redirect semantics as
 * `signInWithGoogle`.
 */
export const linkGoogleAccount = async ({
  callbackURL = "/dashboard/settings",
  errorCallbackURL = "/dashboard/settings",
}: SocialSignInOptions = {}) =>
  authClient.linkSocial({
    provider: "google",
    callbackURL,
    errorCallbackURL,
  });

const oauthErrorMessages: Record<string, string> = {
  account_not_linked:
    "An account with this email already exists. Sign in with your password, then connect Google under Settings.",
  email_not_found: "Google did not share an email address for this account.",
  access_denied: "Google sign in was cancelled.",
  oauth_provider_not_found: "Google sign in is not configured on this server.",
  unable_to_link_account: "We could not connect your Google account.",
  unable_to_create_user:
    "We could not create an account from your Google profile.",
  signup_disabled: "Sign up with Google is currently disabled.",
};

export const getOAuthErrorMessage = (code: string) =>
  oauthErrorMessages[code] ?? "Google sign in failed. Please try again.";
