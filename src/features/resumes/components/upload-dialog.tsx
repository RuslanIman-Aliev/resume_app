"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResumeUpload } from "@/features/resumes/hooks/use-resume-upload";
import { TARGET_ROLE_SUGGESTIONS } from "@/lib/ui-config";
import { Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Self-contained "Upload Resume" dialog. Owns the upload orchestration via
 * `useResumeUpload` and renders the trigger button, dropzone, and form.
 */
export const UploadDialog = () => {
  const {
    file,
    resumeName,
    setResumeName,
    targetRole,
    setTargetRole,
    open,
    setOpen,
    handleFileSelect,
    handleUpload,
    isUploading,
    isCreating,
  } = useResumeUpload();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shouldAutoOpen = searchParams.get("upload") === "1";

  // Lets other screens link straight into the upload flow - the analyzer sends
  // people here when they have no resume to analyze. The parameter is dropped
  // again so a refresh or a back-navigation does not reopen the dialog.
  useEffect(() => {
    if (!shouldAutoOpen) {
      return;
    }

    setOpen(true);
    router.replace(pathname, { scroll: false });
  }, [shouldAutoOpen, pathname, router, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="hover:bg-primary/80 cursor-pointer" asChild>
        <Button
          onClick={() => setOpen(true)}
          className="h-11 w-full md:h-8 md:w-auto"
        >
          Upload Resume
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md [&>[data-slot=dialog-close]]:size-11 sm:[&>[data-slot=dialog-close]]:size-7">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Upload Resume
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload your resume to get AI-powered analysis and optimization
            suggestions
          </DialogDescription>
        </DialogHeader>

        {/* THE DROPZONE */}
        <div
          className={`relative min-h-40 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            file
              ? "border-primary bg-primary/10"
              : "border-muted bg-muted/20 hover:border-primary/50"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-7 w-7 text-primary" />
          </div>

          {file ? (
            <div className="text-center mt-4">
              <p className="text-sm font-medium text-primary">
                {file.name.length > 30
                  ? file.name.substring(0, 15) +
                    "..." +
                    file.name.substring(file.name.length - 10)
                  : file.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center mt-4">
              <p className="text-sm font-medium">
                Drag and drop your resume here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click to browse (PDF| DOCX| DOC, max 4MB)
              </p>
            </div>
          )}

          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        {file && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="resumeName">Resume Name</Label>
              <Input
                id="resumeName"
                placeholder="e.g., Software Engineer - General"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                className="h-11 md:h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target Role</Label>
              <Input
                id="targetRole"
                list="targetRoleSuggestions"
                placeholder="e.g. Software Engineer, Accountant, Copywriter"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="h-11 md:h-8"
              />
              {/* A datalist keeps the field free text while still offering the
                  common roles. A native list is deliberate: the browser gives
                  keyboard and screen-reader behaviour that a hand-rolled
                  suggestion popover would have to reimplement. */}
              <datalist id="targetRoleSuggestions">
                {TARGET_ROLE_SUGGESTIONS.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11 md:h-8">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="h-11 md:h-8"
            disabled={
              !file ||
              isUploading ||
              !resumeName ||
              !targetRole.trim() ||
              isCreating
            }
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Resume"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
