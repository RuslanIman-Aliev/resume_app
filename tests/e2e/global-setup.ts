import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import prisma from "../../src/lib/db";
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

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/signup`);

    await page.getByLabel("Name").fill(testUser.name);
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByLabel("Confirm Password").fill(testUser.password);

    await Promise.all([
      page.waitForURL(/\/dashboard$/),
      page.getByRole("button", { name: "Sign Up", exact: true }).click(),
    ]);

    await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
    await page.context().storageState({ path: storageStatePath });
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
