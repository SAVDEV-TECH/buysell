import OpenAI from "openai";

/**
 * Server-side OpenAI client instance.
 * Ensures the API key is accessed strictly on the server.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});
