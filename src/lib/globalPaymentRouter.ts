/**
 * globalPaymentRouter.ts
 *
 * Central routing logic for global buyer payment collection.
 * Determines which payment provider to use based on the buyer's country.
 *
 * Flow:
 *   African Buyer   → Paystack (NGN, KES) or Flutterwave (XOF, GHS, etc.)
 *   European Buyer  → Stripe (SEPA, card, SWIFT)
 *   US/Canada       → Stripe (ACH, card)
 *   Chinese Buyer   → VertoFX (CNY wire, UnionPay)
 *   Other Asia      → Stripe
 */

export type GlobalPaymentMethod =
  | "paystack"
  | "flutterwave"
  | "mobile-money"
  | "stripe"
  | "verto_fx";

export interface PaymentRoute {
  method: GlobalPaymentMethod;
  currency: string;
  currencySymbol: string;
  displayLabel: string;
  /** Instructions shown to the buyer for this method */
  instructions: string;
  /** True when this method supports escrow lock-in (i.e. server-side capture) */
  supportsEscrow: boolean;
  /** Stripe payment method types to enable for this route */
  stripePaymentMethods?: string[];
}

/** Payment routing table. Key = ISO 2-letter country code. */
export const PAYMENT_ROUTES: Record<string, PaymentRoute> = {
  // ─── African Markets (Paystack / Flutterwave / Mobile Money) ────────────────
  NG: { method: "paystack",     currency: "NGN", currencySymbol: "₦",    displayLabel: "Pay with Paystack (NGN)",       instructions: "Pay securely via card, bank transfer, or USSD.",      supportsEscrow: true },
  KE: { method: "paystack",     currency: "KES", currencySymbol: "Ksh",  displayLabel: "Pay with Paystack (KES)",       instructions: "Pay via M-Pesa, card, or bank transfer.",             supportsEscrow: true },
  GH: { method: "flutterwave",  currency: "GHS", currencySymbol: "GH₵",  displayLabel: "Pay with Flutterwave (GHS)",    instructions: "Pay via MTN Mobile Money, Vodafone Cash, or card.",   supportsEscrow: true },
  TG: { method: "flutterwave",  currency: "XOF", currencySymbol: "CFA",  displayLabel: "Pay with Flutterwave (CFA)",    instructions: "Paiement via Togocel Money ou carte bancaire.",       supportsEscrow: true },
  GW: { method: "flutterwave",  currency: "XOF", currencySymbol: "CFA",  displayLabel: "Pay with Flutterwave (CFA)",    instructions: "Pagamento via transferência bancária ou cartão.",     supportsEscrow: true },
  SN: { method: "flutterwave",  currency: "XOF", currencySymbol: "CFA",  displayLabel: "Pay with Flutterwave (CFA)",    instructions: "Paiement via Wave, Orange Money, ou carte.",          supportsEscrow: true },
  CI: { method: "flutterwave",  currency: "XOF", currencySymbol: "CFA",  displayLabel: "Pay with Flutterwave (CFA)",    instructions: "Paiement via Orange Money, MTN Mobile Money.",        supportsEscrow: true },
  CM: { method: "flutterwave",  currency: "XAF", currencySymbol: "FCFA", displayLabel: "Pay with Flutterwave (XAF)",    instructions: "Paiement via Mobile Money ou carte bancaire.",        supportsEscrow: true },
  UG: { method: "mobile-money", currency: "UGX", currencySymbol: "USh",  displayLabel: "Pay via Mobile Money (UGX)",    instructions: "Pay with Airtel Money or MTN Mobile Money.",          supportsEscrow: true },
  ZA: { method: "paystack",     currency: "ZAR", currencySymbol: "R",    displayLabel: "Pay with Paystack (ZAR)",       instructions: "Pay by card or EFT bank transfer.",                   supportsEscrow: true },
  EG: { method: "flutterwave",  currency: "EGP", currencySymbol: "£",    displayLabel: "Pay with Flutterwave (EGP)",    instructions: "Pay via card or bank transfer.",                      supportsEscrow: true },
  MA: { method: "flutterwave",  currency: "MAD", currencySymbol: "د.م.", displayLabel: "Pay with Flutterwave (MAD)",    instructions: "Pay via card or bank transfer.",                      supportsEscrow: true },

  // ─── Europe (Stripe + SEPA) ──────────────────────────────────────────────────
  DE: { method: "stripe", currency: "EUR", currencySymbol: "€",  displayLabel: "Pay via Stripe (SEPA/Card)",    instructions: "Pay securely by SEPA bank transfer or credit/debit card.", supportsEscrow: true, stripePaymentMethods: ["card", "sepa_debit"] },
  FR: { method: "stripe", currency: "EUR", currencySymbol: "€",  displayLabel: "Pay via Stripe (SEPA/Card)",    instructions: "Paiement sécurisé par virement SEPA ou carte bancaire.",  supportsEscrow: true, stripePaymentMethods: ["card", "sepa_debit"] },
  GB: { method: "stripe", currency: "GBP", currencySymbol: "£",  displayLabel: "Pay via Stripe (Bacs/Card)",    instructions: "Pay by Bacs Direct Debit or credit/debit card.",           supportsEscrow: true, stripePaymentMethods: ["card", "bacs_debit"] },
  NL: { method: "stripe", currency: "EUR", currencySymbol: "€",  displayLabel: "Pay via Stripe (iDEAL/Card)",   instructions: "Betaal via iDEAL of credit/debitcard.",                   supportsEscrow: true, stripePaymentMethods: ["card", "ideal", "sepa_debit"] },
  IT: { method: "stripe", currency: "EUR", currencySymbol: "€",  displayLabel: "Pay via Stripe (SEPA/Card)",    instructions: "Paga con bonifico SEPA o carta di credito/debito.",      supportsEscrow: true, stripePaymentMethods: ["card", "sepa_debit"] },
  ES: { method: "stripe", currency: "EUR", currencySymbol: "€",  displayLabel: "Pay via Stripe (SEPA/Card)",    instructions: "Paga por transferencia SEPA o tarjeta bancaria.",         supportsEscrow: true, stripePaymentMethods: ["card", "sepa_debit"] },

  // ─── Americas (Stripe + ACH) ─────────────────────────────────────────────────
  US: { method: "stripe", currency: "USD", currencySymbol: "$",   displayLabel: "Pay via Stripe (ACH/Card)",     instructions: "Pay by ACH bank transfer or credit/debit card.",          supportsEscrow: true, stripePaymentMethods: ["card", "us_bank_account"] },
  CA: { method: "stripe", currency: "CAD", currencySymbol: "CA$", displayLabel: "Pay via Stripe (Card/PAD)",     instructions: "Pay by pre-authorized debit or credit card.",             supportsEscrow: true, stripePaymentMethods: ["card", "acss_debit"] },
  BR: { method: "stripe", currency: "BRL", currencySymbol: "R$",  displayLabel: "Pay via Stripe (Pix/Card)",     instructions: "Pague com Pix ou cartão de crédito/débito.",              supportsEscrow: true, stripePaymentMethods: ["card", "boleto"] },

  // ─── Asia ────────────────────────────────────────────────────────────────────
  // China uses VertoFX for CNY→USD wholesale FX conversion before escrow lock
  CN: { method: "verto_fx", currency: "CNY", currencySymbol: "¥",   displayLabel: "Pay via VertoFX (CNY Wire)",    instructions: "Pay by CNY SWIFT wire or UnionPay. Funds auto-convert to USD for escrow.", supportsEscrow: true },
  IN: { method: "stripe",   currency: "INR", currencySymbol: "₹",   displayLabel: "Pay via Stripe (UPI/Card)",     instructions: "Pay by UPI, Net Banking, or credit/debit card.",          supportsEscrow: true, stripePaymentMethods: ["card", "upi"] },
  JP: { method: "stripe",   currency: "JPY", currencySymbol: "¥",   displayLabel: "Pay via Stripe (Konbini/Card)", instructions: "Pay by convenience store payment or credit card.",         supportsEscrow: true, stripePaymentMethods: ["card", "konbini"] },
  SG: { method: "stripe",   currency: "SGD", currencySymbol: "S$",  displayLabel: "Pay via Stripe (PayNow/Card)",  instructions: "Pay by PayNow or credit/debit card.",                     supportsEscrow: true, stripePaymentMethods: ["card", "paynow"] },
  AE: { method: "stripe",   currency: "AED", currencySymbol: "د.إ", displayLabel: "Pay via Stripe (Card)",         instructions: "Pay by international credit or debit card.",              supportsEscrow: true, stripePaymentMethods: ["card"] },
};

/** Default route when country is unknown or not in the table */
const DEFAULT_ROUTE: PaymentRoute = {
  method: "stripe",
  currency: "USD",
  currencySymbol: "$",
  displayLabel: "Pay via Stripe (International Card)",
  instructions: "Pay by international credit or debit card. Funds held in USD escrow.",
  supportsEscrow: true,
  stripePaymentMethods: ["card"],
};

/**
 * Returns the payment route for a given ISO country code.
 * Always returns a valid route (falls back to Stripe USD).
 */
export function getPaymentRoute(countryCode: string): PaymentRoute {
  return PAYMENT_ROUTES[countryCode.toUpperCase()] ?? DEFAULT_ROUTE;
}

/**
 * Determines if the buyer is from an international (non-African) market.
 * Used to show the Stripe UI vs. the African payment UI.
 */
export function isInternationalBuyer(countryCode: string): boolean {
  const route = PAYMENT_ROUTES[countryCode.toUpperCase()];
  if (!route) return true; // Unknown country → treat as international
  return route.method === "stripe" || route.method === "verto_fx";
}

/**
 * Returns all supported buyer countries grouped by region.
 * Useful for building a country selector dropdown.
 */
export function getBuyerCountriesByRegion(): Record<string, Array<{ code: string; label: string; currency: string }>> {
  const groups: Record<string, Array<{ code: string; label: string; currency: string }>> = {};

  for (const [code, route] of Object.entries(PAYMENT_ROUTES)) {
    // Import region from geolocation indirectly via a simplified inline map
    const region = getRegion(code);
    if (!groups[region]) groups[region] = [];
    groups[region].push({ code, label: getCountryName(code), currency: route.currency });
  }

  return groups;
}

// Minimal inline maps to avoid circular imports with geolocation.ts
function getRegion(code: string): string {
  const regionMap: Record<string, string> = {
    NG: "Africa", KE: "Africa", GH: "Africa", TG: "Africa", GW: "Africa",
    SN: "Africa", CI: "Africa", CM: "Africa", UG: "Africa", ZA: "Africa",
    EG: "Africa", MA: "Africa",
    DE: "Europe", FR: "Europe", GB: "Europe", NL: "Europe", IT: "Europe", ES: "Europe",
    US: "Americas", CA: "Americas", BR: "Americas",
    CN: "Asia", IN: "Asia", JP: "Asia", SG: "Asia", AE: "Middle East",
  };
  return regionMap[code] ?? "Other";
}

function getCountryName(code: string): string {
  const names: Record<string, string> = {
    NG: "Nigeria", KE: "Kenya", GH: "Ghana", TG: "Togo", GW: "Guinea-Bissau",
    SN: "Senegal", CI: "Côte d'Ivoire", CM: "Cameroon", UG: "Uganda",
    ZA: "South Africa", EG: "Egypt", MA: "Morocco",
    DE: "Germany", FR: "France", GB: "United Kingdom", NL: "Netherlands",
    IT: "Italy", ES: "Spain",
    US: "United States", CA: "Canada", BR: "Brazil",
    CN: "China", IN: "India", JP: "Japan", SG: "Singapore", AE: "UAE",
  };
  return names[code] ?? code;
}
