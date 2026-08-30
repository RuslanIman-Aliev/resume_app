import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { parseAnalysisChannel } from "@/lib/pusher-channels";
import { createPusherServer } from "@/lib/pusher-server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Signs a subscription to a private analysis channel.
 *
 * Pusher calls this before letting a browser join `private-*`. Authorization
 * is the point of the endpoint: it refuses unless the caller is signed in and
 * the resource behind the channel name belongs to them, which is what keeps
 * one user's analysis events out of another user's socket.
 *
 * Pusher's client sends `socket_id` and `channel_name` form-encoded.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.formData();
  const socketId = body.get("socket_id");
  const channelName = body.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const channel = parseAnalysisChannel(channelName);

  if (!channel) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
  }

  // `count` with the owner in the `where` clause, so a channel for someone
  // else's resume is indistinguishable from one for a resume that never
  // existed - neither answer confirms anything about the other user's data.
  const owned =
    channel.kind === "resume"
      ? await prisma.resume.count({
          where: { id: channel.resumeId, userId: session.user.id },
        })
      : await prisma.jobApplication.count({
          where: { id: channel.applicationId, userId: session.user.id },
        });

  if (owned === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResponse = createPusherServer().authorizeChannel(
    socketId,
    channelName,
  );

  return NextResponse.json(authResponse);
}
