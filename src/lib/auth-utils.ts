import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/**
 * Server-side authentication guard for protected routes.
 * Verifies user session and redirects to signup if not authenticated.
 * @returns Current user session object if authenticated
 * @throws Redirects to /signup if session does not exist
 */
export const requireAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signup");
  }

  return session;
};

/**
 * Server-side guard for public/auth pages to prevent authenticated users from accessing them.
 * Redirects to dashboard if user is already authenticated.
 * @returns Session object if user is not authenticated (or null)
 * @throws Redirects to /dashboard if session exists
 */
export const requireUnauth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return session;
};
