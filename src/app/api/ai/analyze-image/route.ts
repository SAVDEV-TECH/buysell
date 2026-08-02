import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return errorResponse("Image URL or base64 data string is required", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key is missing in environment", 500);
    }

    const prompt = `
Analyze this B2B product image in detail.
Extract and return a valid JSON object with the following fields:
- suggestedTitle: A professional B2B product title based on what is visible in the photo.
- category: Most accurate wholesale product category (e.g. Industrial Machinery, Apparel, Electronics, Chemicals, Hardware, Home & Garden).
- primaryColor: Main color visible.
- material: Likely material grade/composition visible (e.g. Stainless Steel, Cotton, Polymer, Aluminum).
- attributes: Array of 3-5 key visible physical attributes (e.g. Heavy Duty, Waterproof, Glossy Finish).
- tags: Array of 6-8 search tags for a wholesale marketplace.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No vision analysis returned from AI service", 500);
    }

    const parsedData = JSON.parse(content);

    return successResponse(parsedData, "Product image analyzed successfully with Vision AI.");
  } catch (error) {
    return handleApiError(error, "Failed to analyze product image with Vision AI");
  }
}
