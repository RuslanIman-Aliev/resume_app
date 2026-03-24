import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const resumeRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileUrl: z.string().url(),
        resumeName: z.string(),
        postedRole: z.string(),
        thumbnailUrl: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resume = await prisma.resume.create({
        data: {
          fileName: input.fileName,
          resumeName: input.resumeName,
          postedRole: input.postedRole,
          resumeLink: input.fileUrl,
          userId: ctx.auth.user.id,
          resumePreviewLink: input.thumbnailUrl,
        },
      });
      return { resume };
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const resumes = await prisma.resume.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { resumes };
  }),
});
