import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetLanguage } = body;

    if (!text || typeof text !== "string") {
      return errorResponse("Text content is required for translation", 400);
    }

    if (!targetLanguage || typeof targetLanguage !== "string") {
      return errorResponse("Target language is required", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key missing in environment", 500);
    }

    const prompt = `
Translate the following B2B wholesale trade description/text into ${targetLanguage}.
Maintain technical precision, international trade terminology (incoterms, MOQs, units), and natural professional tone.

Text to translate:
"""
${text}
"""

Return a valid JSON object with:
- translatedText: string
- languageName: string (${targetLanguage})
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional international trade translator. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No translation returned from AI service", 500);
    }

    const parsedData = JSON.parse(content);

    return successResponse(parsedData, `Text translated successfully to ${targetLanguage}.`);
  } catch (error) {
    return handleApiError(error, "Failed to translate text with AI");
  }
}
