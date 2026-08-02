import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

/**
 * Standardized success JSON response
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return NextResponse.json(body, { status });
}

/**
 * Standardized error JSON response
 */
export function errorResponse(message: string, status = 400, errorDetails?: string) {
  const body: ApiResponse = {
    success: false,
    message,
    error: errorDetails,
  };
  return NextResponse.json(body, { status });
}

/**
 * Centralized API error logger and fallback handler
 */
export function handleApiError(error: unknown, fallbackMessage = "An unexpected error occurred") {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[API Error] ${fallbackMessage}:`, errorMessage);

  if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
    return errorResponse(
      "OpenAI API quota exceeded. Please check your OpenAI billing balance at https://platform.openai.com/account/billing to top up credits.",
      429,
      errorMessage
    );
  }

  return errorResponse(fallbackMessage, 500, errorMessage);
}
