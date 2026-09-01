"use client";

import { getErrorFeedback } from "@/lib/error-feedback";
import { hasStrippedGermanDiacritics } from "@/lib/extraction-quality";
import { logError } from "@/lib/logger";
import { generateDocxThumbnail } from "@/lib/thumbnails-docx";
import { generatePdfThumbnail } from "@/lib/thumbnails";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

/** The `maxFileSize` UploadThing enforces for every accepted resume type. */
export const MAX_RESUME_FILE_MB = 4;
const MAX_RESUME_FILE_BYTES = MAX_RESUME_FILE_MB * 1024 * 1024;

const SUPPORTED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

/**
 * One toast id for the whole upload, so the flow shows a single notification
 * that moves from "uploading" to "saving" to its outcome.
 *
 * The success used to fire the moment the file reached UploadThing, before
 * `resume.create` had written anything: a failed save produced "uploaded
 * successfully" followed by an error, and a successful one produced two
 * success toasts. Only the mutation resolves this toast now.
 */
const UPLOAD_TOAST_ID = "resume-upload";

/**
 * Accepts the file types the uploader is configured for.
 *
 * Extension first, MIME type second: browsers disagree about what they report
 * for .doc and .docx, and a file picked through "All files" can arrive with an
 * empty type.
 */
const isSupportedResumeFile = (file: File) => {
  const name = file.name.toLowerCase();
  return (
    SUPPORTED_RESUME_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type.includes("wordprocessingml")
  );
};

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

      toast.success("Resume uploaded successfully!", { id: UPLOAD_TOAST_ID });
    },
    onError: (error) => {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to save resume.",
        }).message,
        { id: UPLOAD_TOAST_ID },
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
          // Everything downstream - analysis, match score, cover letter - is
          // generated from this text, and the model copies its orthography. A
          // German resume that arrives without umlauts silently produces a
          // German cover letter without umlauts, which the user would have no
          // way to explain. Warn at the point the damage is detectable.
          if (
            hasStrippedGermanDiacritics(documentFile.serverData?.extractedText)
          ) {
            toast.warning("Umlauts may be missing from this resume", {
              description:
                "The text we extracted reads as German but contains no ä, ö, ü or ß. Anything generated from it will have the same problem. Try re-saving the file as a PDF or DOCX and uploading again.",
              duration: 12_000,
            });
          }

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
      toast.error("Error occurred while uploading. Please try again.", {
        id: UPLOAD_TOAST_ID,
      });
    },
  });

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Both limits are the ones UploadThing enforces server-side. Checking here
    // means an oversized or wrong-typed file is refused on selection, instead
    // of after the thumbnail render and the upload round-trip.
    if (!isSupportedResumeFile(selected)) {
      toast.error("Choose a PDF, DOC or DOCX file.");
      e.target.value = "";
      return;
    }

    if (selected.size > MAX_RESUME_FILE_BYTES) {
      toast.error(
        `That file is ${(selected.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_RESUME_FILE_MB} MB.`,
      );
      e.target.value = "";
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;

    toast.loading("Uploading resume...", { id: UPLOAD_TOAST_ID });

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

      // Still in flight: `onClientUploadComplete` fires `resume.create`, and
      // that mutation owns the final state of this toast.
      toast.loading("Saving resume...", { id: UPLOAD_TOAST_ID });
    } catch (error) {
      logError("Thumbnail generation error", error, { resumeName, targetRole });
      toast.error(
        "Preview generation failed. Uploading without a thumbnail.",
      );

      try {
        await startUpload([file]);
        toast.loading("Saving resume...", { id: UPLOAD_TOAST_ID });
      } catch (uploadError) {
        logError("Resume upload failed", uploadError, {
          resumeName,
          targetRole,
        });
        toast.error("Failed to upload resume", { id: UPLOAD_TOAST_ID });
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
