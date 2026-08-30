import { auth } from "@/lib/auth";
import {
  extractResumeContent,
  isResumeImageFile,
} from "@/lib/resume-extraction";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { logError } from "@/lib/logger";

const f = createUploadthing();
const utapi = new UTApi();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "application/msword": {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session || !session.user) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        if (isResumeImageFile(file.name)) {
          return {
            uploadedBy: metadata.userId,
            type: "image",
          };
        }

        const fileResponse = await fetch(file.ufsUrl);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const { extractedText, type } = await extractResumeContent(
          file.name,
          arrayBuffer,
        );

        return {
          uploadedBy: metadata.userId,
          extractedText,
          type,
        };
      } catch (error) {
        await utapi.deleteFiles(file.key);
        logError("Upload process error", error, {
          fileName: file.name,
          fileType: file.type,
        });
        throw new Error("Failed to process uploaded file.");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
