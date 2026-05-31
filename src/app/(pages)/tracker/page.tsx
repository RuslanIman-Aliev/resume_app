
import MainView from "@/features/tracker/components/main-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Tracker | AI-Tailor",
  description: "Track your applications, interviews, and offers in one place.",
};


const TrackerPage = () => {
  

  return (
    <div>
      <MainView />
    </div>
  );
};

export default TrackerPage;
