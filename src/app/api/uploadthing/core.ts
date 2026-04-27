import { auth } from "@/lib/auth";
import { normalizeResumeParsedContent } from "@/lib/resume-content";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
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
        const normalizedFileName = file.name.toLowerCase();

        if (
          normalizedFileName.endsWith(".png") ||
          normalizedFileName.endsWith(".jpg") ||
          normalizedFileName.endsWith(".jpeg")
        ) {
          return {
            uploadedBy: metadata.userId,
            type: "image",
          };
        }

        const fileResponse = await fetch(file.ufsUrl);
        const arrayBuffer = await fileResponse.arrayBuffer();

        if (normalizedFileName.endsWith(".docx")) {
          const buffer = Buffer.from(arrayBuffer);

          const { value: extractedHtml } = await mammoth.convertToHtml({
            buffer,
          });

          return {
            uploadedBy: metadata.userId,
            extractedText: normalizeResumeParsedContent(extractedHtml),
            type: "docx",
          };
        }

        if (normalizedFileName.endsWith(".doc")) {
          const buffer = Buffer.from(arrayBuffer);

          const { value: extractedText } = await mammoth.extractRawText({
            buffer,
          });

          return {
            uploadedBy: metadata.userId,
            extractedText: normalizeResumeParsedContent(extractedText),
            type: "docx",
          };
        }

        if (normalizedFileName.endsWith(".pdf")) {
          const { text } = await extractText(new Uint8Array(arrayBuffer), {
            mergePages: true,
          });

          return {
            uploadedBy: metadata.userId,
            extractedText: normalizeResumeParsedContent(text),
            type: "pdf",
          };
        }

        throw new Error("Unsupported file format.");
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
