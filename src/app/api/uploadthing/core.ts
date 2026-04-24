import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { extractText } from "unpdf";

const f = createUploadthing();
const utapi = new UTApi();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: {
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
        const pdfUrl = file.ufsUrl;
        const pdfFileResponse = await fetch(pdfUrl);
        const pdfBuffer = await pdfFileResponse.arrayBuffer();
        // Use unpdf to extract text from the PDF
        const { text: extractedText } = await extractText(
          new Uint8Array(pdfBuffer),
          {
            mergePages: true,
          },
        );
        return {
          uploadedBy: metadata.userId,
          extractedText,
          type: "pdf",
        };
      } catch {
        await utapi.deleteFiles(file.key);
        throw new Error("Failed to process uploaded file.");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
