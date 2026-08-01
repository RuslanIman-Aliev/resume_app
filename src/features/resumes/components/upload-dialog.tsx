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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResumeUpload } from "@/features/resumes/hooks/use-resume-upload";
import { Upload } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="hover:bg-primary/80 cursor-pointer" asChild>
        <Button onClick={() => setOpen(true)}>Upload Resume</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target Role</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software-engineer">
                    Software Engineer
                  </SelectItem>
                  <SelectItem value="frontend-developer">
                    Frontend Developer
                  </SelectItem>
                  <SelectItem value="backend-developer">
                    Backend Developer
                  </SelectItem>
                  <SelectItem value="full-stack">
                    Full Stack Developer
                  </SelectItem>
                  <SelectItem value="data-engineer">Data Engineer</SelectItem>
                  <SelectItem value="product-manager">
                    Product Manager
                  </SelectItem>
                  <SelectItem value="ux-designer">UX Designer</SelectItem>
                  <SelectItem value="devops">DevOps Engineer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={
              !file || isUploading || !resumeName || !targetRole || isCreating
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
