import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <FileQuestion className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Resume not found</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          This resume doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
      <Button asChild className="min-h-11 sm:min-h-0">
        <Link href="/resumes">Back to Resumes</Link>
      </Button>
    </div>
  );
}
