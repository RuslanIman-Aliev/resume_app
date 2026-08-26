"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobMatchPusher } from "@/hooks/usePusher";
import {
  ApplicationData,
  KeywordsGapData,
  MatchingSkillItem,
  MissingSkillItem,
  RequirementsMatchData,
  SkillImportance,
  SkillsGapData,
} from "@/lib/types";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Mail,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback } from "react";
import AnalyzeCoverLetter from "./analyze-cover-letter";
import AnalyzeKeywords from "./analyze-keywords";
import AnalyzeRequirementsMatch from "./analyze-requirements-match";
import {
  AnalyzeResumeError,
  AnalyzeResumeLoading,
  AnalyzeResumePending,
} from "./analyze-resume-states";
import AnalyzeSkillsGap from "./analyze-skills-gap";
import AnalyzerResults from "./analyzer-results";

const AnalyzeResumeImprovements = dynamic(
  () => import("./analyze-resume-improvements"),
  {
    ssr: false,
  },
);

const AnalyzeOriginalResume = dynamic(
  () =>
    import("./analyze-original-resume").then(
      (mod) => mod.AnalyzeOriginalResume,
    ),
  {
    ssr: false,
  },
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeSkillsGapData = (value: unknown): SkillsGapData => {
  const data = isRecord(value) ? value : {};

  return {
    soft: Array.isArray(data.soft) ? data.soft : [],
    technical: Array.isArray(data.technical) ? data.technical : [],
    missingCriticalSkills: Array.isArray(data.missingCriticalSkills)
      ? data.missingCriticalSkills
      : [],
  };
};

const normalizeKeywordsGapData = (value: unknown): KeywordsGapData => {
  const data = isRecord(value) ? value : {};

  return {
    found: Array.isArray(data.found) ? data.found : [],
    missing: Array.isArray(data.missing) ? data.missing : [],
  };
};

const skillImportanceValues: readonly string[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

const normalizeSkillImportance = (value: unknown): SkillImportance | null =>
  typeof value === "string" && skillImportanceValues.includes(value)
    ? (value as SkillImportance)
    : null;

const normalizeMatchingSkills = (value: unknown): MatchingSkillItem[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) =>
    isRecord(item) && typeof item.skill === "string"
      ? [
          {
            skill: item.skill,
            importance: normalizeSkillImportance(item.importance),
          },
        ]
      : [],
  );
};

const normalizeMissingSkills = (value: unknown): MissingSkillItem[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) =>
    isRecord(item) && typeof item.skill === "string"
      ? [{ skill: item.skill, impact: normalizeSkillImportance(item.impact) }]
      : [],
  );
};

const normalizeRequirementsMatchData = (
  value: unknown,
): RequirementsMatchData => {
  const data = isRecord(value) ? value : {};

  return {
    required: Array.isArray(data.required) ? data.required : [],
    preferred: Array.isArray(data.preferred) ? data.preferred : [],
  };
};

export const AnalyzeResumeClient = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || "overview";
  const analyzeId = params?.analyzeId as string | undefined;
  const trpc = useTRPC();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    ...trpc.resume.getJobMatchResult.queryOptions({
      applicationId: analyzeId ?? "",
    }),
    retry: (failureCount, queryError) => {
      const errorCode = (queryError as { data?: { code?: string } } | null)
        ?.data?.code;

      if (errorCode === "NOT_FOUND") return false;
      return failureCount < 2;
    },
    refetchInterval: (query) => {
      const errorCode = (
        query.state.error as { data?: { code?: string } } | null
      )?.data?.code;

      if (errorCode === "NOT_FOUND") return 4000;

      return false;
    },
  });
  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code;
  const isPendingAnalysis = errorCode === "NOT_FOUND";

  const handleAnalysisReady = useCallback(() => {}, []);
  useJobMatchPusher(analyzeId ?? "", handleAnalysisReady);

  if (isPendingAnalysis) {
    return <AnalyzeResumePending />;
  }

  if (isLoading) {
    return <AnalyzeResumeLoading />;
  }

  if (isError) {
    return <AnalyzeResumeError onRetry={refetch} isRetrying={isFetching} />;
  }

  const appData = data?.application;

  if (!appData) {
    return <AnalyzeResumeError onRetry={refetch} isRetrying={isFetching} />;
  }

  const rawSkillsGap = (appData as { skillsGap?: unknown }).skillsGap;
  const skillsGapData = normalizeSkillsGapData(rawSkillsGap);

  const rawKeywordsGap = (appData as { keywordsGap?: unknown }).keywordsGap;
  const keywordsGapData = normalizeKeywordsGapData(rawKeywordsGap);
  const rawRequirementsMatch = (appData as { requirementsMatch?: unknown })
    .requirementsMatch;
  const requirementsMatchData =
    normalizeRequirementsMatchData(rawRequirementsMatch);
  const matchingSkills = normalizeMatchingSkills(
    (appData as { matchingSkills?: unknown }).matchingSkills,
  );
  const missingSkills = normalizeMissingSkills(
    (appData as { missingSkills?: unknown }).missingSkills,
  );
  const improvementsArray = (appData as unknown as { improvements?: unknown[] })
    .improvements;
  const improvementsCount = improvementsArray?.length || 0;

  const summaryObj = (
    appData as unknown as {
      summary?: { estimatedScoreWithAllImprovements?: number };
    }
  ).summary;
  const potentialScore = summaryObj?.estimatedScoreWithAllImprovements || 100;

  const navigateToImprovements = () => {
    router.push(`${pathname}?tab=improvements`, { scroll: false });
  };
  return (
    <>
      <AnalyzerResults
        position={appData.jobTitle ?? ""}
        company={appData.companyName ?? ""}
        experience={appData.experience ?? ""}
        salaryRange={appData.salaryRange ?? ""}
        matchScore={appData.matchScore ?? 0}
        updatedAt={appData.updatedAt ?? ""}
      />

      <Tabs
        className="text-white flex flex-col gap-1! mt-4 flex-1 min-h-0"
        value={currentTab}
        onValueChange={(val) =>
          router.push(`${pathname}?tab=${val}`, { scroll: false })
        }
      >
        <TabsList className="bg-background p-1 w-full max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-auto md:w-fit md:justify-center md:overflow-x-visible md:group-data-horizontal/tabs:h-8">
          <TabsTrigger
            value="overview"
            className="text-white!  py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Target className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="improvements"
            className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Improvements
          </TabsTrigger>
          <TabsTrigger
            value="skills-gap"
            className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Zap className="h-4 w-4 mr-2" />
            Skills Gap
          </TabsTrigger>
          <TabsTrigger
            value="keywords"
            className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
          <TabsTrigger
            value="cover-letter"
            className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Mail className="h-4 w-4 mr-2" />
            Cover Letter
          </TabsTrigger>
          <TabsTrigger
            value="original"
            className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <FileText className="h-4 w-4 mr-2" />
            Original Resume
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex-1 min-h-0">
          <AnalyzeRequirementsMatch
            data={requirementsMatchData}
            improvementsCount={improvementsCount}
            potentialScore={potentialScore}
            onViewImprovements={navigateToImprovements}
          />
        </TabsContent>

        <TabsContent value="improvements" className="mt-4 flex-1 min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <AnalyzeResumeImprovements
              data={appData as unknown as ApplicationData}
              resumeId={appData.resumeId}
              applicationId={appData.id}
            />
          </div>
        </TabsContent>
        <TabsContent value="cover-letter" className="mt-4 flex-1 min-h-0">
          <AnalyzeCoverLetter
            coverLetterText={appData.coverLetterText ?? null}
            matchingSkills={matchingSkills}
            missingSkills={missingSkills}
            companyName={appData.companyName ?? null}
            jobTitle={appData.jobTitle ?? null}
          />
        </TabsContent>
        <TabsContent value="original" className="mt-4 flex-1 min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <AnalyzeOriginalResume resumeId={appData.resumeId} />
          </div>
        </TabsContent>
        <TabsContent value="skills-gap" className="mt-4 flex-1 min-h-0">
          <AnalyzeSkillsGap data={skillsGapData} />
        </TabsContent>
        <TabsContent value="keywords" className="mt-4 flex-1 min-h-0">
          <AnalyzeKeywords data={keywordsGapData} />
        </TabsContent>
      </Tabs>
      {/* <div className="grid lg:grid-cols-2 gap-6">
        <AnalyzerRequirements />

       
        <AnalyzerSkills />
      </div>

      <AnalyzerSuggestions /> */}
    </>
  );
};
