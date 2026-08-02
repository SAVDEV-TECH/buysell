import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, keywords, targetAudience } = body;

    if (!title || typeof title !== "string") {
      return errorResponse("Product title is required to generate description", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key is missing in environment", 500);
    }

    const prompt = `
You are an expert B2B eCommerce copywriter and product manager for a global wholesale marketplace (BuySell).
Generate a comprehensive, professional B2B product listing based on the following details:

Product Title: ${title}
Category: ${category || "General B2B Commercial Goods"}
Keywords/Key Highlights: ${keywords || "High quality, bulk supply, export grade"}
Target Audience: ${targetAudience || "Wholesale buyers, distributors, and procurement managers"}

Please return a valid JSON object with the following fields:
- description: A detailed 2-3 paragraph persuasive B2B product description highlighting manufacturing quality, bulk suitability, compliance, and warranty.
- keyFeatures: Array of 4-6 concise bullet points of top product features.
- suggestedSpecifications: Object with 4-6 key technical specification key-value pairs (e.g., Material, Certification, MOQ, Warranty, Lead Time).
- metaKeywords: Array of 6-10 relevant search tags for marketplace SEO.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional B2B marketplace product copywriter. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No content received from AI service", 500);
    }

    const parsedData = JSON.parse(content);

    return successResponse({
      description: parsedData.description || "",
      keyFeatures: parsedData.keyFeatures || [],
      suggestedSpecifications: parsedData.suggestedSpecifications || {},
      metaKeywords: parsedData.metaKeywords || [],
    }, "AI product description generated successfully.");
  } catch (error) {
    return handleApiError(error, "Failed to generate AI product description");
  }
}
