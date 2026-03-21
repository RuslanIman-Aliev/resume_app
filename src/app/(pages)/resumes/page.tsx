import ResumeCard from "@/features/resumes/components/resume-card";
import ResumeManager from "@/features/resumes/components/resume-manager";

const ResumesPage = () => {
  return (
    <div className="flex flex-col container max-w-7xl mx-auto pt-10">
      <ResumeManager />
      <ResumeCard />
    </div>
  );
};

export default ResumesPage;
