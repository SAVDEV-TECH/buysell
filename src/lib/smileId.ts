/**
 * smileId.ts
 *
 * Smile ID integration client for Pan-African Know Your Business (KYB) and Document Verification.
 * Supports:
 * - CAC (Nigeria) Corporate Verification
 * - RCCM (Togo & Guinea-Bissau) Commercial Registry Verification
 * - GRS (Ghana) Business Registration Verification
 * - Identity Document OCR & Verification (Director ID, Tax Certificates)
 *
 * Smile ID API Docs: https://docs.usesmileid.com/
 */

export interface SmileIdBusinessLookupRequest {
  country: string; // ISO 2-letter country code (NG, TG, GW, GH, KE)
  business_type: string; // 'cac', 'rccm', 'grs', 'cr12'
  registration_number: string;
  company_name?: string;
  callback_url?: string;
}

export interface SmileIdVerificationResult {
  success: boolean;
  job_id: string;
  is_verified: boolean;
  company_name?: string;
  registration_number?: string;
  registration_date?: string;
  tax_id?: string;
  address?: string;
  directors?: Array<{ name: string; title: string }>;
  raw_response?: Record<string, any>;
  message?: string;
}

/**
 * Server-side Smile ID client.
 * Uses SMILE_ID_PARTNER_ID, SMILE_ID_API_KEY, and SMILE_ID_ENVIRONMENT env vars.
 */
export class SmileIdClient {
  private partnerId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.partnerId = process.env.SMILE_ID_PARTNER_ID || "";
    this.apiKey = process.env.SMILE_ID_API_KEY || "";
    const env = process.env.SMILE_ID_ENVIRONMENT || "sandbox";
    this.baseUrl =
      env === "production"
        ? "https://api.smileidentity.com/v1"
        : "https://sandbox.smileidentity.com/v1";
  }

  /**
   * Verifies an African business registration number against official government registries.
   */
  async verifyBusiness(request: SmileIdBusinessLookupRequest): Promise<SmileIdVerificationResult> {
    const jobId = `job_kyb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!this.partnerId || !this.apiKey) {
      console.warn(
        `[SMILE_ID] SMILE_ID_PARTNER_ID or SMILE_ID_API_KEY not configured. ` +
        `Simulating sandbox verification for Reg #${request.registration_number}.`
      );

      // Simulation mode for development/sandbox when API keys are not yet added
      const isSimulatedValid = request.registration_number.length >= 5;
      return {
        success: true,
        job_id: jobId,
        is_verified: isSimulatedValid,
        company_name: request.company_name || "Simulated Verified Enterprise Ltd",
        registration_number: request.registration_number,
        registration_date: "2021-04-15",
        tax_id: `TAX-${request.registration_number}`,
        address: `12 Export Way, ${request.country}`,
        directors: [{ name: "Lead Director", title: "Managing Director" }],
        message: isSimulatedValid
          ? "Business successfully verified in registry (Sandbox Simulation)."
          : "Registration number not found in registry (Sandbox Simulation).",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/business_verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "smile-id-partner-id": this.partnerId,
          "smile-id-api-key": this.apiKey,
        },
        body: JSON.stringify({
          partner_params: {
            job_id: jobId,
            user_id: `org_${request.registration_number}`,
            job_type: 7, // Job type 7 = Business Verification
          },
          country: request.country,
          id_type: request.business_type.toUpperCase(),
          id_number: request.registration_number,
          business_name: request.company_name,
          callback_url: request.callback_url,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Smile ID API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const isVerified = data.result?.Actions?.Verify_Business === "APPROVED";

      return {
        success: true,
        job_id: jobId,
        is_verified: isVerified,
        company_name: data.result?.company_name || request.company_name,
        registration_number: data.result?.registration_number || request.registration_number,
        registration_date: data.result?.registration_date,
        tax_id: data.result?.tax_id,
        address: data.result?.address,
        raw_response: data,
        message: isVerified
          ? "Corporate registration verified with official government registry."
          : "Verification pending or rejected by government registry.",
      };
    } catch (error: any) {
      console.error("[SMILE_ID] Business verification error:", error);
      return {
        success: false,
        job_id: jobId,
        is_verified: false,
        message: error.message || "Failed to contact verification service.",
      };
    }
  }
}

export const smileId = new SmileIdClient();
