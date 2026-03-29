import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoachScoreCard } from "@/features/ai-coach/components/coach-score-card";
import MainScoreCard from "@/features/ai-coach/components/main-score-card";
import {
  Briefcase,
  CheckCircle2,
  Code,
  FileText,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";

const AiCoachPage = () => {
  return (
    <section className="">
      <div className="max-w-7xl mx-auto flex flex-col my-10">
        <div className="flex flex-row gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-bold mb-4">AI Career Coach</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Get personalized AI-powered suggestions to improve your resume,
          prepare for interviews, and land your dream job faster.
        </p>
        <Tabs className=" text-white flex flex-col gap-1! mt-4">
          <TabsList className="bg-background p-1">
            <TabsTrigger
              value="overview"
              className="text-white! cursor-pointer py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <Target className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="improvements"
              className="text-white! cursor-pointer py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Improvements
            </TabsTrigger>
            <TabsTrigger
              value="action-plan"
              className="text-white! cursor-pointer py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Action Plan
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="text-white! cursor-pointer py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <MainScoreCard />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              <CoachScoreCard
                icon={FileText}
                title="Content Quality"
                score={78}
                description="Clear and relevant content"
              />
              <CoachScoreCard
                icon={Code}
                title="ATS Optimization"
                score={65}
                description="Keyword matching"
              />
              <CoachScoreCard
                icon={Briefcase}
                title="Experience"
                score={82}
                description="Impact and achievements"
              />
              <CoachScoreCard
                icon={GraduationCap}
                title="Skills Match"
                score={71}
                description="Industry relevance"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default AiCoachPage;
