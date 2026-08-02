import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("Messages array is required", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key missing in environment", 500);
    }

    const systemPrompt = {
      role: "system",
      content: `You are BuySell AI, an intelligent B2B Sourcing Assistant for BuySell — a global wholesale B2B marketplace connecting manufacturers, suppliers, and buyers.

Your capabilities include:
1. Helping buyers locate verified manufacturers, raw material suppliers, and products.
2. Explaining BuySell Escrow Protection (funds held safely until buyer confirms inspection & receipt).
3. Helping buyers draft Requests for Quotations (RFQs) and estimate MOQs/shipping lead times.
4. Assisting suppliers with pricing tiers, compliance badges, and exports.

Tone: Professional, helpful, concise, and knowledgeable in B2B trade, logistics, customs, and wholesale procurement.
Keep responses well-formatted with markdown lists or short paragraphs. Avoid overly long disclaimers.`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages.slice(-10)], // keep last 10 turns for context efficiency
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply = completion.choices[0]?.message?.content || "I apologize, I could not process your trade query at the moment.";

    return NextResponse.json({
      success: true,
      message: reply,
    });
  } catch (error) {
    return handleApiError(error, "AI Sourcing Assistant failed to respond");
  }
}
