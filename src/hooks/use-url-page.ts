"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Reads the `page` query param as the source of truth and returns a writer
 * that updates it in the URL. Centralizes the pagination URL logic shared by
 * the resumes and recent-analyses lists.
 */
export function useUrlPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const page = Number(searchParams.get("page")) || 1;

  const setPage = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", pageNumber.toString());
      replace(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [searchParams, pathname, replace],
  );

  return { page, setPage };
}
