/**
 * URL contract for the recent-analyses list.
 *
 * Extracted from the list component so the server page can read the same
 * parameters and prefetch exactly the query the client will ask for. The two
 * have to agree down to the value, or the prefetched entry sits unused under a
 * different query key and the page fetches again on mount.
 *
 * No `zod` and no "use client" here on purpose: the module is imported by both
 * a server component and a client one.
 */

export type ScoreFilter = "all" | "high" | "medium" | "low";
export type SortBy = "date" | "score";

export const scoreParamKey = "score";
export const sortParamKey = "sort";
export const pageParamKey = "page";

/** Anything that can answer `get("score")` - `URLSearchParams`, or Next's. */
export type SearchParamsReader = {
  get: (name: string) => string | null;
};

export const parseScoreFilter = (value: string | null): ScoreFilter => {
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

export const parseSortBy = (value: string | null): SortBy => {
  switch (value) {
    case "date":
    case "score":
      return value;
    default:
      return "date";
  }
};

export const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const getScoreFilterFromParams = (
  params: SearchParamsReader,
): ScoreFilter => parseScoreFilter(params.get(scoreParamKey));

export const getSortByFromParams = (params: SearchParamsReader): SortBy =>
  parseSortBy(params.get(sortParamKey));

/**
 * The exact input `recent-analyses-list` passes to
 * `jobApplication.getJobApplication` on first render.
 *
 * `jobTitle` is the empty string rather than omitted because the search box is
 * local state that starts empty - and an omitted key is a different query key
 * than an empty one.
 */
export const getListQueryInput = (params: SearchParamsReader) => ({
  page: parsePage(params.get(pageParamKey)),
  jobTitle: "",
  filterScore: getScoreFilterFromParams(params),
  sortBy: getSortByFromParams(params),
});
