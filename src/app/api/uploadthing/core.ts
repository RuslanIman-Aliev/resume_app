import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";

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
        if (
          file.name.endsWith(".png") ||
          file.name.endsWith(".jpg") ||
          file.name.endsWith(".jpeg")
        ) {
          return {
            uploadedBy: metadata.userId,
            type: "image",
          };
        }

        const fileResponse = await fetch(file.ufsUrl);
        const arrayBuffer = await fileResponse.arrayBuffer();

        if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
          const buffer = Buffer.from(arrayBuffer);
          
          const { value: extractedHtml } = await mammoth.convertToHtml({ buffer });

          return {
            uploadedBy: metadata.userId,
            extractedText: extractedHtml, 
            type: "docx",
          };
        }

        if (file.name.endsWith(".pdf")) {
          const { text } = await extractText(new Uint8Array(arrayBuffer), {
            mergePages: true,
          });

          const formattedPdfText = text
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => `<p>${line}</p>`)
            .join('');

          return {
            uploadedBy: metadata.userId,
            extractedText: formattedPdfText, 
            type: "pdf",
          };
        }

        throw new Error("Unsupported file format.");

      } catch (error) {
        await utapi.deleteFiles(file.key);
        console.error("Upload process error:", error);
        throw new Error("Failed to process uploaded file.");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
