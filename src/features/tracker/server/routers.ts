import prisma from "@/lib/db";
import { trackerFormSchema } from "@/lib/types";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";

export const trackerRouter = createTRPCRouter({
  create: protectedProcedure
    .input(trackerFormSchema)
    .mutation(async ({ ctx, input }) => {
      const newApplication = await prisma.trackerPosition.create({
        data: {
          userId: ctx.auth.user.id,
          company: input.company,
          position: input.position,
          location: input.location,
          salary: input.salary,
          status: input.status,
          url: input.url,
          notes: input.notes,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
        },
      });
      return newApplication;
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const applications = await prisma.trackerPosition.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return applications;
  }),
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "saved",
          "applied",
          "screening",
          "interview",
          "offer",
          "rejected",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedApplication = await prisma.trackerPosition.update({
        where: { id: input.id, userId: ctx.auth.user.id },
        data: { status: input.status },
      });
      return updatedApplication;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.trackerPosition.delete({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
      return { success: true };
    }),
});
