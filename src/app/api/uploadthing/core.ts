import { auth } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();
const utapi = new UTApi();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: {
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
        // 1. Ask ConvertAPI to turn the first page of the PDF into a JPG
        const convertResponse = await fetch(
          `https://v2.convertapi.com/convert/pdf/to/jpg?Secret=${process.env.CONVERT_API_SECRET}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Parameters: [
                {
                  Name: "File",
                  FileValue: { Url: file.url },
                },
                { Name: "StoreFile", Value: true },
                { Name: "PageRange", Value: "1" },
                { Name: "ImageResolution", Value: "350" },
              ],
            }),
          },
        );

        if (!convertResponse.ok) {
          const errorDetails = await convertResponse.text();
          console.error("CONVERT_API_REJECTED:", errorDetails);

          throw new Error(`API Error: ${errorDetails}`);
        }

        const convertData = await convertResponse.json();
        const temporaryImageUrl = convertData.Files[0].Url;
        const uploadResult = await utapi.uploadFilesFromUrl(temporaryImageUrl);

        return {
          uploadedBy: metadata.userId,
          thumbnailUrl: uploadResult.data?.url,
        };
      } catch (error) {
        console.error("Thumbnail generation failed:", error);
        // Fallback: return null so the app doesn't crash if the API fails
        return { uploadedBy: metadata.userId, thumbnailUrl: null };
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
