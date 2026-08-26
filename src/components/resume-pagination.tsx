import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ResumePaginationProps = {
  /** The page currently shown (server-clamped when available). */
  currentPage: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the requested page number. */
  onPageChange: (page: number) => void;
};

/**
 * Numbered pagination controls shared by the resumes and recent-analyses
 * lists. Renders nothing when there is a single page or fewer.
 */
export function ResumePagination({
  currentPage,
  pageCount,
  onPageChange,
}: ResumePaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-8 mb-4 border-t pt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              className={`h-11 min-w-11 sm:h-8 sm:min-w-0 ${
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }`}
            />
          </PaginationItem>

          {Array.from({ length: pageCount }).map((_, i) => {
            const pageNumber = i + 1;
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  onClick={() => onPageChange(pageNumber)}
                  isActive={currentPage === pageNumber}
                  className="cursor-pointer size-11 sm:size-8"
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(currentPage + 1, pageCount))}
              className={`h-11 min-w-11 sm:h-8 sm:min-w-0 ${
                currentPage === pageCount
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
