import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, totalAmount, currency, items, status } = body;

    if (!orderId) {
      return errorResponse("Order ID is required", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key missing in environment", 500);
    }

    const prompt = `
Analyze this B2B wholesale order/quotation transaction for deal fairness and risk:

Order ID: ${orderId}
Total Value: ${currency || "USD"} ${totalAmount}
Order Status: ${status || "processing"}
Items: ${JSON.stringify(items || [])}

Provide a structured risk & pricing evaluation. Return a valid JSON object with:
- fairnessScore: number (integer 80 to 99)
- dealAssessment: string (2-3 sentences summarizing whether this order is priced fairly for wholesale B2B trade)
- riskLevel: "low" | "medium" | "high"
- KeyInsights: Array of 3 short recommendations for escrow release, inspection, or logistics.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert B2B escrow risk analyst and pricing advisor. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No quotation insights returned from AI service", 500);
    }

    const parsedData = JSON.parse(content);

    return successResponse(parsedData, "AI quotation and deal insights generated successfully.");
  } catch (error) {
    return handleApiError(error, "Failed to analyze quotation insights");
  }
}
