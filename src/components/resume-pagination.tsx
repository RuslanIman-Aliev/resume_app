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
                  onClick={() => onPageChange(pageNumber)}
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
              onClick={() => onPageChange(Math.min(currentPage + 1, pageCount))}
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
  );
}
