"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ResumePagination } from "@/components/resume-pagination";
import { getMatchScoreBadgeClass } from "@/lib/analysis/score-color";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyDataCard } from "@/features/analyzer/components/empty-data-card";
import { useUrlPage } from "@/hooks/use-url-page";
import { useTRPC } from "@/trpc/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpDown,
  Building2Icon,
  CalendarIcon,
  Clock,
  FileTextIcon,
  Filter,
  Search,
  SearchX,
  Target,
  TrendingUpIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ScoreFilter = "all" | "high" | "medium" | "low";
type SortBy = "date" | "score";

const scoreParamKey = "score";
const sortParamKey = "sort";

type SearchParamsReader = {
  get: (name: string) => string | null;
};

const parseScoreFilter = (value: string | null): ScoreFilter => {
  switch (value) {
    case "all":
    case "high":
    case "medium":
    case "low":
      return value;
    default:
      return "all";
  }
};

const parseSortBy = (value: string | null): SortBy => {
  switch (value) {
    case "date":
    case "score":
      return value;
    default:
      return "date";
  }
};

const getScoreFilterFromParams = (params: SearchParamsReader): ScoreFilter =>
  parseScoreFilter(params.get(scoreParamKey));

const getSortByFromParams = (params: SearchParamsReader): SortBy =>
  parseSortBy(params.get(sortParamKey));

const SCORE_FILTER_LABELS = {
  all: "All Scores",
  high: "High (80%+)",
  medium: "Medium (60-79%)",
  low: "Low (<60%)",
} as const;

const SORT_LABELS = {
  date: "Date",
  score: "Score",
} as const;

const CardComponent = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) => {
  return (
    <Card className="border-border/60 bg-card/60 mt-4 border-dashed w-full">
      <CardContent className="py-6 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex flex-col gap-0">
            <h2 className="text-2xl font-bold">{value}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
const RecentAnalysesList = () => {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const filterScore = getScoreFilterFromParams(searchParams);
  const sortBy = getSortByFromParams(searchParams);
  const { page: currentPage, setPage: handlePageChange } = useUrlPage();

  const resetToFirstPage = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (!params.has("page") || params.get("page") === "1") {
      return;
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const params = new URLSearchParams(searchParams);
      let changed = false;

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          if (params.has(key)) {
            params.delete(key);
            changed = true;
          }
          continue;
        }

        if (params.get(key) !== value) {
          params.set(key, value);
          changed = true;
        }
      }

      if (resetPage && params.has("page") && params.get("page") !== "1") {
        params.set("page", "1");
        changed = true;
      }

      if (!changed) return;

      const nextUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedQuery !== searchQuery) {
        setDebouncedQuery(searchQuery);
        resetToFirstPage();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedQuery, resetToFirstPage]);

  const updateScoreFilter = useCallback(
    (nextFilter: ScoreFilter) => {
      if (nextFilter === filterScore) return;
      updateParams(
        { [scoreParamKey]: nextFilter === "all" ? null : nextFilter },
        true,
      );
    },
    [filterScore, updateParams],
  );

  const updateSortBy = useCallback(
    (nextSort: SortBy) => {
      if (nextSort === sortBy) return;
      updateParams(
        { [sortParamKey]: nextSort === "date" ? null : nextSort },
        true,
      );
    },
    [sortBy, updateParams],
  );

  const { data, isLoading, error } = useQuery({
    ...trpc.jobApplication.getJobApplication.queryOptions({
      page: currentPage,
      jobTitle: debouncedQuery,
      filterScore,
      sortBy,
    }),
    placeholderData: keepPreviousData,
  });

  const pageCount = data?.pagination?.pageCount ?? 1;
  const activePage = data?.pagination?.currentPage ?? currentPage;
  if (isLoading && !data) {
    return (
      <div className="w-full animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="border-border/60 bg-card/60 mt-4 border-dashed w-full"
            >
              <CardContent className="py-6 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex flex-col items-start gap-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col justify-center items-center sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Skeleton className="w-full h-10 rounded-md" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-30 rounded-md" />
            <Skeleton className="h-10 w-30 rounded-md" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <Card
              key={i}
              className="border border-border/40 bg-card/40 w-full h-22"
            >
              <CardContent className="p-4 flex items-center gap-5">
                <Skeleton className="flex h-13 w-14 shrink-0 rounded-xl" />
                <div className="flex flex-col gap-2.5 flex-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-28 rounded-full" />
                  </div>
                  <div className="flex items-center gap-x-5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <EmptyDataCard
          title="Something went wrong"
          description="We couldn't load your recent analyses. Please try refreshing the page."
          icon={<AlertCircle className="h-8 w-8 text-destructive" />}
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 sm:gap-6">
        <CardComponent
          title="Total Analyses"
          value={data?.totalAnalyses ?? 0}
          icon={<FileTextIcon className="h-5 w-5" />}
        />
        <CardComponent
          title="Average Match Score"
          value={data?.averageScore ? `${data.averageScore}%` : "N/A"}
          icon={<Target className="h-5 w-5" />}
        />
        <CardComponent
          title="High Matches (80%+)"
          value={data?.highMatches ?? 0}
          icon={<TrendingUpIcon className="h-5 w-5" />}
        />
        <CardComponent
          title="This Week"
          value={data?.thisWeek ?? 0}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="flex flex-col justify-center items-stretch gap-4 mb-6 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-md border border-border/50 bg-secondary/30 text-base md:text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 min-h-11 sm:flex-none sm:min-h-0">
                <Filter className="h-4 w-4" />
                {SCORE_FILTER_LABELS[filterScore]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateScoreFilter("all")}>
                All Scores
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateScoreFilter("high")}>
                High (80%+)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateScoreFilter("medium")}>
                Medium (60-79%)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateScoreFilter("low")}>
                Low (&lt;60%)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 min-h-11 sm:flex-none sm:min-h-0">
                <ArrowUpDown className="h-4 w-4" />
                {SORT_LABELS[sortBy]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateSortBy("date")}>
                Sort by Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateSortBy("score")}>
                Sort by Score
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {data?.application.length === 0 ? (
          <div className="py-6">
            <EmptyDataCard
              title={debouncedQuery ? "No matches found" : "No analyses yet"}
              description={
                debouncedQuery
                  ? `We couldn't find any job or company matching "${debouncedQuery}".`
                  : "You haven't run any resume analyses yet. Add a job description to get started."
              }
              icon={<SearchX className="h-8 w-8 text-muted-foreground/60" />}
            />
          </div>
        ) : (
          data?.application.map((analysis) => {
            const score = analysis.matchScore ?? 0;
            const scoreBoxClass = getMatchScoreBadgeClass(score);

            return (
              <Card
                key={analysis.id}
                className="group border border-border/40 hover:cursor-pointer hover:border-primary/50 bg-card/40 backdrop-blur hover:bg-card/60 transition-all duration-300"
                onClick={() => {
                  router.push(`/analyzer/${analysis.id}`);
                }}
              >
                <CardContent className="p-4 flex items-center gap-5">
                  <div
                    className={`flex h-13 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${scoreBoxClass}`}
                  >
                    <span className="text-xl font-bold">{score}%</span>
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {analysis.jobTitle}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="bg-secondary text-muted-foreground hover:bg-secondary border-none rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        {analysis.improvementsCount} Improvements
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2Icon className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate max-w-45">
                          {analysis.companyName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileTextIcon className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate max-w-45">
                          {analysis.resume.resumeName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
                        <span>
                          {new Date(
                            analysis.updatedAt ?? "",
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <ResumePagination
        currentPage={activePage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default RecentAnalysesList;
