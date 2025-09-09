// pages/api/conversations.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { persona, conversationId } = req.query;

  try {
    // Find the signed-in user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return res.status(200).json({ messages: [] });

    let conversation = null;

    // If conversationId is provided, fetch that specific conversation (and verify ownership)
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else if (persona) {
      // Otherwise, get the most recent conversation for this persona
      conversation = await prisma.conversation.findFirst({
        where: { userId: user.id, persona },
        orderBy: { createdAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else {
      // If no persona is provided, return a list of conversations to choose from
      const conversations = await prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, persona: true, createdAt: true },
      });
      return res.status(200).json({ conversations });
    }

    const messages =
      conversation?.messages?.map((m) => ({
        id: m.id,
        role: m.role,          // "user" | "assistant"
        content: m.content,
        createdAt: m.createdAt,
      })) ?? [];

    return res
      .status(200)
      .json({ conversationId: conversation?.id ?? null, messages });
  } catch (err) {
    console.error("CONVERSATIONS API ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
