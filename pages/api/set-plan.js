import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { plan, queries } = req.body;
  if (!plan || typeof queries !== "number")
    return res.status(400).json({ error: "Missing plan or queries" });

  if (!session.user.email)
    return res.status(400).json({ error: "User email not found" });

  try {
    // Upsert user: create if not exists
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { plan, remainingQueries: queries },
      create: {
        email: session.user.email,
        name: session.user.name || "User",
        plan,
        remainingQueries: queries,
      },
    });

    res.status(200).json({ message: "Plan updated", user });
  } catch (err) {
    console.error("SET PLAN ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
