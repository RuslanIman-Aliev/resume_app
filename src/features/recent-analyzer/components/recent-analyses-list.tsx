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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyDataCard } from "@/features/analyzer/components/empty-data-card";
import { useTRPC } from "@/trpc/client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  const { replace } = useRouter();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const currentPage = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedQuery !== searchQuery) {
        setDebouncedQuery(searchQuery);
        const params = new URLSearchParams(searchParams);
        if (params.has("page") && params.get("page") !== "1") {
          params.set("page", "1");
          replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedQuery, searchParams, pathname, replace]);

  const handlePageChange = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", pageNumber.toString());
      replace(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [searchParams, pathname, replace],
  );

  const { data, isLoading, error } = useQuery({
    ...trpc.jobApplication.getJobApplication.queryOptions({
      page: currentPage,
      jobTitle: debouncedQuery,
    }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (
      data?.pagination?.currentPage &&
      data.pagination.currentPage !== currentPage
    ) {
      handlePageChange(data.pagination.currentPage);
    }
  }, [data?.pagination?.currentPage, currentPage, handlePageChange]);

  const pageCount = data?.pagination?.pageCount ?? 1;
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
      <div className="flex gap-6 mb-6">
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

      <div className="flex flex-col justify-center items-center sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by job title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-border/50 bg-secondary/30 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {/* {filterScore === "all" ? "All Scores" : 
                   filterScore === "high" ? "High (80%+)" :
                   filterScore === "medium" ? "Medium (60-79%)" : "Low (<60%)"} */}
                All Scores
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem //onClick={() => setFilterScore("all")}
              >
                All Scores
              </DropdownMenuItem>
              <DropdownMenuItem //onClick={() => setFilterScore("high")}
              >
                High (80%+)
              </DropdownMenuItem>
              <DropdownMenuItem //onClick={() => setFilterScore("medium")}
              >
                Medium (60-79%)
              </DropdownMenuItem>
              <DropdownMenuItem //onClick={() => setFilterScore("low")}
              >
                Low (&lt;60%)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {/* {sortBy === "date" ? "Date" : "Score"} */}
                Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
              //onClick={() => setSortBy("date")}
              >
                Sort by Date
              </DropdownMenuItem>
              <DropdownMenuItem //onClick={() => setSortBy("score")}
              >
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
            let scoreBoxClass =
              "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
            if (score >= 80)
              scoreBoxClass =
                "text-green-500 border-green-500/30 bg-green-500/10";
            else if (score < 50)
              scoreBoxClass = "text-red-500 border-red-500/30 bg-red-500/10";

            return (
              <Card
                key={analysis.id}
                className="group border border-border/40 hover:cursor-pointer hover:border-primary/50 bg-card/40 backdrop-blur hover:bg-card/60 transition-all duration-300"
              
                onClick={() => {router.push(`/analyzer/${analysis.id}`)}}>
                <CardContent className="p-4 flex items-center gap-5">
                  <div
                    className={`flex h-13 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${scoreBoxClass}`}
                  >
                    <span className="text-xl font-bold">{score}%</span>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-3">
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
                          {new Date(analysis.updatedAt ?? "").toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
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
      {pageCount > 1 && (
        <div className="mt-8 mb-4 border-t pt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: pageCount }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNumber)}
                      isActive={currentPage === pageNumber}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(currentPage + 1, pageCount))
                  }
                  className={
                    currentPage === pageCount
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default RecentAnalysesList;
