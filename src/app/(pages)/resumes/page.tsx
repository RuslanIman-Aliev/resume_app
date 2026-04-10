import ResumeCard from "@/features/resumes/components/resume-card";
import ResumeManager from "@/features/resumes/components/resume-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resumes | AI-Tailor",
  description: "Manage your resumes, analyze them, and track improvements.",
};

const ResumesPage = () => {
  return (
    <div className="flex flex-col container w-full mx-auto pt-10">
      <ResumeManager />
      <ResumeCard />
    </div>
  );
};

export default ResumesPage;
