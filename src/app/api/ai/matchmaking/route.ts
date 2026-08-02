import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfqTitle, description, category } = body;

    if (!rfqTitle || typeof rfqTitle !== "string") {
      return errorResponse("RFQ title is required for supplier matchmaking", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OpenAI API key missing in environment", 500);
    }

    const supabaseAdmin = createAdminClient();

    // Fetch verified supplier organizations
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id, company_name, company_type, country, city, description, verification_level, is_active")
      .eq("verification_level", "verified")
      .limit(15);

    const supplierCatalog = (orgs || []).map((o) => ({
      id: o.id,
      name: o.company_name,
      type: o.company_type || "Manufacturer",
      location: `${o.city || ""}, ${o.country || "Global"}`.trim(),
      description: o.description || "Verified industrial manufacturer and wholesale distributor.",
    }));

    const prompt = `
You are the AI Matchmaker for BuySell wholesale platform.
Match the following Buyer RFQ (Request for Quotation) with the most suitable verified suppliers from the catalog below:

BUYER RFQ:
Title: ${rfqTitle}
Category: ${category || "General Industrial Goods"}
Description/Specs: ${description || "Bulk supply requirements."}

SUPPLIER CATALOG:
${JSON.stringify(supplierCatalog, null, 2)}

Select the top 3 best-matching suppliers. Return a valid JSON object with a "matches" array where each entry has:
- supplierId: string
- supplierName: string
- matchScore: number (integer 75 to 99)
- matchRationale: string (1-2 sentences explaining why this manufacturer matches the RFQ)
- estimatedLeadDays: number (e.g. 7, 10, 14)
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a B2B procurement matchmaker. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return errorResponse("No matchmaking results returned from AI service", 500);
    }

    const parsedData = JSON.parse(content);

    return successResponse(parsedData.matches || [], "Top matching suppliers retrieved successfully.");
  } catch (error) {
    return handleApiError(error, "Failed to run AI supplier matchmaking");
  }
}
