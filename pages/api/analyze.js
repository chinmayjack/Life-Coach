// /pages/api/analyze.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

// Helper to read raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", err => reject(err));
  });
}

// Timeout wrapper
async function withTimeout(promise, ms) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) =>
    (timeout = setTimeout(() => reject(new Error("OpenAI request timed out")), ms))
  );
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  let scenario = "";
  let persona = "General Coach";

  try {
    const rawBody = (await getRawBody(req)).trim();

    // Attempt to parse JSON, fallback to raw text
    if (req.headers["content-type"]?.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawBody || "{}");
        scenario = parsed.scenario || "";
        persona = parsed.persona || persona;
      } catch (err) {
        // invalid JSON, fallback to raw text
        scenario = rawBody;
      }
    } else {
      scenario = rawBody;
    }

    if (!scenario) return res.status(400).json({ error: "No scenario provided" });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: { email: session.user.email, name: session.user.name || "User" },
    });

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: { persona, user: { connect: { id: user.id } } },
    });

    // Save user message
    await prisma.message.create({
      data: { role: "user", content: scenario, conversationId: conversation.id },
    });

    // Call OpenAI GPT with timeout
    const aiResponse = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful ${persona}. Respond in concise bullet points (•).`,
          },
          { role: "user", content: scenario },
        ],
        temperature: 0.7,
      }).then(c => c.choices[0]?.message?.content || "• No response"),
      30000
    );

    // Save AI response
    await prisma.message.create({
      data: { role: "assistant", content: aiResponse, conversationId: conversation.id },
    });

    res.status(200).json({ conversationId: conversation.id, response: aiResponse });
  } catch (err) {
    console.error("API ERROR:", err);
    const isTimeout = err.message.includes("timed out");
    res.status(500).json({
      error: isTimeout ? "OpenAI request timed out. Try again." : "Internal server error",
      details: err.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
