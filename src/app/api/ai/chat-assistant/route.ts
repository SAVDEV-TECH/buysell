import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse("Messages array is required", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        message: "I am BuySell AI Sourcing Assistant! You can explore our verified manufacturers and products directly on the Marketplace or request custom RFQ quotes from verified suppliers.",
      });
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

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [systemPrompt, ...messages.slice(-10)],
        temperature: 0.7,
        max_tokens: 600,
      });

      const reply = completion.choices[0]?.message?.content || "I am available to assist you with locating verified suppliers and issuing RFQ requests on BuySell!";

      return NextResponse.json({
        success: true,
        message: reply,
      });
    } catch (apiErr: unknown) {
      const errStr = apiErr instanceof Error ? apiErr.message : String(apiErr);
      console.warn("[AI Sourcing Assistant] OpenAI API notice:", errStr);

      // Graceful degradation response on 429 / Quota
      return NextResponse.json({
        success: true,
        message: "Hello! I am BuySell Sourcing Assistant. I can help you search our verified marketplace products, calculate freight estimates, or connect directly with verified manufacturers on BuySell!",
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI Assistant] Unexpected error:", message);
    return NextResponse.json({
      success: true,
      message: "Welcome to BuySell B2B Assistant. Feel free to browse our verified marketplace products or issue RFQs directly to suppliers.",
    });
  }
}
