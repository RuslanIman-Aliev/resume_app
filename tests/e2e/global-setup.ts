import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { parseSetCookieHeader } from "better-auth/cookies";
import prisma from "../../src/lib/db";
import { auth } from "../../src/lib/auth";
import { seedAnalysis, seedResume, testUser } from "./fixtures/test-data";

const storageStatePath = path.resolve(
  process.cwd(),
  "tests/e2e/.auth/user.json",
);

const loadEnv = () => {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
};

export default async function globalSetup(config: FullConfig) {
  loadEnv();

  await prisma.user.deleteMany({ where: { email: testUser.email } });

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://127.0.0.1:3000";
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    },
    returnHeaders: true,
    returnStatus: true,
  });

  const status = signUpResult.status;
  const response = signUpResult.response as
    | { error?: unknown; token?: unknown }
    | undefined;
  const statusFailed =
    typeof status === "number" && (status < 200 || status >= 300);

  if (statusFailed || response?.error) {
    throw new Error(
      `Sign up failed: ${status ?? "unknown"} ${JSON.stringify(response)}`,
    );
  }

  const signInResult = await auth.api.signInEmail({
    body: {
      email: testUser.email,
      password: testUser.password,
    },
    returnHeaders: true,
    returnStatus: true,
  });

  const signInStatus = signInResult.status;
  const signInResponse = signInResult.response as
    | { error?: unknown }
    | undefined;
  const signInFailed =
    typeof signInStatus === "number" &&
    (signInStatus < 200 || signInStatus >= 300);

  if (signInFailed || signInResponse?.error) {
    throw new Error(
      `Sign in failed: ${signInStatus ?? "unknown"} ${JSON.stringify(
        signInResponse,
      )}`,
    );
  }

  const signInHeaders = signInResult.headers;
  const rawSetCookie =
    (signInHeaders as { getSetCookie?: () => string[] })
      ?.getSetCookie?.()
      ?.join(",") ??
    signInHeaders?.get("set-cookie") ??
    "";

  const parsedCookies = parseSetCookieHeader(rawSetCookie);
  const sessionCookie = Array.from(parsedCookies.entries()).find(([name]) =>
    name.endsWith("session_token"),
  );

  if (!sessionCookie?.[1]?.value) {
    throw new Error("Sign in did not return a session cookie.");
  }

  const [sessionCookieName, sessionCookieAttributes] = sessionCookie;

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const url = new URL(baseURL);
    await context.addCookies([
      {
        name: sessionCookieName,
        value: sessionCookieAttributes.value,
        url: `${url.origin}/`,
        httpOnly: sessionCookieAttributes.httponly ?? true,
        sameSite:
          sessionCookieAttributes.samesite === "none"
            ? "None"
            : sessionCookieAttributes.samesite === "strict"
              ? "Strict"
              : "Lax",
        secure: sessionCookieAttributes.secure ?? url.protocol === "https:",
      },
    ]);

    await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
    await context.storageState({ path: storageStatePath });
  } finally {
    await browser.close();
  }

  const user = await prisma.user.findUnique({
    where: { email: testUser.email },
  });

  if (!user) {
    throw new Error("Test user was not created.");
  }

  const resume = await prisma.resume.create({
    data: {
      id: seedResume.id,
      userId: user.id,
      fileName: seedResume.fileName,
      resumeName: seedResume.resumeName,
      postedRole: seedResume.postedRole,
      resumeLink: seedResume.resumeLink,
      parsedContent: seedResume.parsedContent,
      resumePreviewLink: seedResume.resumePreviewLink,
      status: seedResume.status,
    },
  });

  await prisma.resumeAnalysis.create({
    data: {
      id: seedAnalysis.id,
      resumeId: resume.id,
      overallScore: seedAnalysis.overallScore,
      contentQuality: seedAnalysis.contentQuality,
      atsOptimization: seedAnalysis.atsOptimization,
      experience: seedAnalysis.experience,
      skillsMatch: seedAnalysis.skillsMatch,
      strengths: seedAnalysis.strengths,
      quickWins: seedAnalysis.quickWins,
      improvements: seedAnalysis.improvements,
      keywords: seedAnalysis.keywords,
    },
  });

  await prisma.$disconnect();
}
