"use client";

import { getErrorFeedback } from "@/lib/error-feedback";
import { logError } from "@/lib/logger";
import { generateDocxThumbnail, generatePdfThumbnail } from "@/lib/thumbnails";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Orchestrates the resume upload flow: local form state, client-side thumbnail
 * generation, UploadThing upload (with a no-thumbnail fallback), and the
 * `resume.create` mutation. Keeps this stateful/imperative logic out of the
 * presentational upload dialog.
 */
export function useResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [open, setOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createResumeMutation = useMutation({
    ...trpc.resume.create.mutationOptions(),
    onSuccess: () => {
      setOpen(false);
      setFile(null);
      setResumeName("");
      setTargetRole("");

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAll.queryKey(),
        refetchType: "active",
      });

      // The analyzer's resume picker and the sidebar read a different query, so
      // without this a freshly uploaded resume is missing from the list you pick
      // from until a full page reload.
      queryClient.invalidateQueries({
        queryKey: trpc.resume.getResumesAndAnalyses.queryKey(),
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

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const uploadToastId = toast.loading("Uploading resume...");

    try {
      let imageFile: File;

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        imageFile = await generatePdfThumbnail(file);
      } else if (
        file.name.endsWith(".docx") ||
        file.name.endsWith(".doc") ||
        file.type.includes("wordprocessingml") ||
        file.type === "application/msword"
      ) {
        imageFile = await generateDocxThumbnail(file);
      } else {
        throw new Error("Unsupported file format for thumbnail generation");
      }

      await startUpload([file, imageFile]);

      toast.success("Resume uploaded successfully", { id: uploadToastId });
    } catch (error) {
      logError("Thumbnail generation error", error, { resumeName, targetRole });
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
        toast.error("Failed to upload resume", { id: uploadToastId });
      }
    }
  };

  return {
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
    isCreating: createResumeMutation.isPending,
  };
}
