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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorFeedback } from "@/lib/error-feedback";
import { logError } from "@/lib/logger";
import { generateDocxThumbnail, generatePdfThumbnail } from "@/lib/utils";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Grid3X3,
  List,
  SearchIcon,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ResumeManager = () => {
  const [file, setFiles] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [open, setOpen] = useState(false);
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }

      params.delete("page"); 

      const currentUrlSearch = searchParams.get("search") || "";
      if (currentUrlSearch !== searchTerm) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, pathname, replace, searchParams]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    
    params.delete("page"); 
    replace(`${pathname}?${params.toString()}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFiles(file);
    }
  };

  const mutationOptions = trpc.resume.create.mutationOptions();

  const createResumeMutation = useMutation({
    ...mutationOptions,
    onSuccess: () => {
      setOpen(false);
      setFiles(null);
      setResumeName("");
      setTargetRole("");

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAll.queryKey(),
        refetchType: "active",
      });

      toast.success("Resume uploaded successfully!");
    },
    onError: (error) => {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to save resume.",
        }).message,
      );
    },
  });

  const { startUpload, isUploading } = useUploadThing("resumeUploader", {
    onClientUploadComplete(res) {
      if (res && res.length > 0) {
        const documentFile = res.find(
          (f) => f.serverData?.type === "pdf" || f.serverData?.type === "docx",
        );
        const imageFile = res.find((f) => f.serverData?.type === "image");

        if (documentFile) {
          createResumeMutation.mutate({
            fileName: documentFile.name,
            fileUrl: documentFile.url,
            resumeName,
            postedRole: targetRole,
            thumbnailUrl: imageFile?.url,
            parsedContent: documentFile.serverData?.extractedText,
          });
        }
      }
    },
    onUploadError: () => {
      toast.error("Error occurred while uploading. Please try again.");
    },
  });

  return (
    <section className="w-full md:px-10">
      <h1 className="text-3xl font-bold mb-6">Resume Manager</h1>

      <div className="flex items-center w-full justify-between mb-6">
        <div className="flex w-full">
          <Field orientation="horizontal" className="max-w-md">
            <InputGroup>
              <InputGroupInput
                id="inline-start-input"
                placeholder="Search resumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Select 
            value={searchParams.get("status") || "all"} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-35 ml-4">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ANALYZED">Analyzed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 ">
          <div className="flex items-center rounded-lg border border-border p-1">
            <Button
              variant={"ghost"}
              size="icon"
              className="h-8 w-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={"ghost"}
              size="icon"
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              className="hover:bg-primary/80 cursor-pointer"
              asChild
            >
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
                        <SelectItem value="data-engineer">
                          Data Engineer
                        </SelectItem>
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
                    !file ||
                    isUploading ||
                    !resumeName ||
                    !targetRole ||
                    createResumeMutation.isPending
                  }
                  onClick={async () => {
                    if (file) {
                      const uploadToastId = toast.loading(
                        "Uploading resume...",
                      );

                      try {
                        let imageFile: File;

                        if (
                          file.type === "application/pdf" ||
                          file.name.endsWith(".pdf")
                        ) {
                          imageFile = await generatePdfThumbnail(file);
                        } else if (
                          file.name.endsWith(".docx") ||
                          file.name.endsWith(".doc") ||
                          file.type.includes("wordprocessingml") ||
                          file.type === "application/msword"
                        ) {
                          imageFile = await generateDocxThumbnail(file);
                        } else {
                          throw new Error(
                            "Unsupported file format for thumbnail generation",
                          );
                        }

                        await startUpload([file, imageFile]);

                        toast.success("Resume uploaded successfully", {
                          id: uploadToastId,
                        });
                      } catch (error) {
                        logError("Thumbnail generation error", error, {
                          resumeName,
                          targetRole,
                        });
                        toast.error(
                          "Preview generation failed. Uploading without a thumbnail.",
                        );

                        try {
                          await startUpload([file]);
                          toast.success("Resume uploaded (without preview)", {
                            id: uploadToastId,
                          });
                        } catch (uploadError) {
                          logError("Resume upload failed", uploadError, {
                            resumeName,
                            targetRole,
                          });
                          toast.error("Failed to upload resume", {
                            id: uploadToastId,
                          });
                        }
                      }
                    }
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Resume"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};

export default ResumeManager;