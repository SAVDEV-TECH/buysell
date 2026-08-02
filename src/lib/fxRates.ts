/**
 * fxRates.ts
 *
 * Live FX rate service for B2B contract pricing.
 *
 * Architecture:
 * 1. Check Supabase fx_rates table (stale if > 4 hours old)
 * 2. If stale, fetch from Open Exchange Rates API (free tier: 1000 calls/month)
 * 3. Store fresh rates back in Supabase for all instances to share
 * 4. Return rate
 *
 * All BuySell contracts are denominated in USD.
 * African payout currencies (NGN, XOF, KES, GHS) are converted from USD at point of payout.
 * Global buyer currencies (EUR, GBP, CNY) are locked at order creation time.
 */

import { createClient } from "@/lib/supabase/server";

/** Currency pairs we actively track. USD is always the base. */
export const TRACKED_PAIRS = [
  "USD_NGN", // Nigeria payout
  "USD_XOF", // Togo, Guinea-Bissau, Senegal, Côte d'Ivoire payout
  "USD_KES", // Kenya payout
  "USD_GHS", // Ghana payout
  "USD_ZAR", // South Africa payout
  "USD_XAF", // Cameroon payout
  "EUR_USD", // European buyers → convert to USD for escrow
  "GBP_USD", // UK buyers → convert to USD for escrow
  "CNY_USD", // Chinese buyers → convert to USD for escrow (via VertoFX)
  "INR_USD", // India buyers
  "SGD_USD", // Singapore buyers
  "CAD_USD", // Canada buyers
] as const;

export type CurrencyPair = (typeof TRACKED_PAIRS)[number];

export interface FxRate {
  currency_pair: string;
  rate: number;
  source: string;
  fetched_at: string;
}

/** Cache validity window: 4 hours (14400 seconds) */
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Fetches the exchange rate for a given pair.
 * Tries Supabase cache first, then Open Exchange Rates API.
 *
 * @param from - Source currency code (e.g. "EUR")
 * @param to   - Target currency code (e.g. "USD")
 * @returns Exchange rate (how many `to` units per 1 `from` unit)
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const pair = `${from}_${to}`;
  const supabase = await createClient();

  try {
    // 1. Try Supabase cache
    const { data: cached } = await supabase
      .from("fx_rates")
      .select("rate, fetched_at")
      .eq("currency_pair", pair)
      .single();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetched_at).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return cached.rate;
      }
    }

    // 2. Cache is stale or missing — fetch from Open Exchange Rates
    const freshRate = await fetchFromOpenExchangeRates(from, to);

    // 3. Upsert into Supabase fx_rates table
    await supabase.from("fx_rates").upsert({
      currency_pair: pair,
      rate: freshRate,
      source: "open_exchange_rates",
      fetched_at: new Date().toISOString(),
    });

    return freshRate;
  } catch (error) {
    console.error(`[FX RATES] Failed to get rate for ${pair}:`, error);

    // Return a hardcoded fallback so the platform doesn't crash.
    // These are approximate values only — never use for financial settlement.
    return FALLBACK_RATES[pair] ?? 1;
  }
}

/**
 * Fetches live rates from Open Exchange Rates API.
 * Requires OPEN_EXCHANGE_RATES_APP_ID in environment variables.
 */
async function fetchFromOpenExchangeRates(from: string, to: string): Promise<number> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;

  if (!appId) {
    console.warn("[FX RATES] OPEN_EXCHANGE_RATES_APP_ID not set. Using fallback rates.");
    const pair = `${from}_${to}`;
    return FALLBACK_RATES[pair] ?? 1;
  }

  // Open Exchange Rates free tier uses USD as base currency.
  // We fetch the base=USD endpoint and compute cross-rates.
  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`,
    { next: { revalidate: 14400 } } // Next.js cache: 4 hours
  );

  if (!response.ok) {
    throw new Error(`Open Exchange Rates API error: ${response.status}`);
  }

  const data: { rates: Record<string, number> } = await response.json();

  // Cross-rate calculation: rate(FROM→TO) = rate(USD→TO) / rate(USD→FROM)
  const fromRate = from === "USD" ? 1 : data.rates[from];
  const toRate = to === "USD" ? 1 : data.rates[to];

  if (!fromRate || !toRate) {
    throw new Error(`Currency not found in OXR response: ${from} or ${to}`);
  }

  return toRate / fromRate;
}

/**
 * Refreshes ALL tracked currency pairs in Supabase.
 * Called by the cron job at /api/cron/fx-rates.
 */
export async function refreshAllRates(): Promise<{ updated: string[]; failed: string[] }> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  const updated: string[] = [];
  const failed: string[] = [];

  if (!appId) {
    console.error("[FX RATES] Cannot refresh: OPEN_EXCHANGE_RATES_APP_ID not set.");
    return { updated, failed: TRACKED_PAIRS as unknown as string[] };
  }

  try {
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`
    );
    const data: { rates: Record<string, number> } = await response.json();
    const supabase = await createClient();

    const upserts = TRACKED_PAIRS.map((pair) => {
      const [from, to] = pair.split("_");
      try {
        const fromRate = from === "USD" ? 1 : data.rates[from];
        const toRate = to === "USD" ? 1 : data.rates[to];

        if (!fromRate || !toRate) {
          failed.push(pair);
          return null;
        }

        const rate = toRate / fromRate;
        updated.push(pair);
        return { currency_pair: pair, rate, source: "open_exchange_rates", fetched_at: new Date().toISOString() };
      } catch {
        failed.push(pair);
        return null;
      }
    }).filter(Boolean);

    if (upserts.length > 0) {
      await supabase.from("fx_rates").upsert(upserts as FxRate[]);
    }
  } catch (error) {
    console.error("[FX RATES] Bulk refresh failed:", error);
    return { updated, failed: TRACKED_PAIRS as unknown as string[] };
  }

  return { updated, failed };
}

/**
 * Converts an amount from one currency to another using live rates.
 * All contracts are pegged to USD internally.
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const rate = await getExchangeRate(from, to);
  return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Fallback rates (hardcoded) used when both the cache and OXR API are unavailable.
 * These will drift from reality over time — treat as display-only.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD_NGN: 1630,
  USD_XOF: 613,
  USD_KES: 129,
  USD_GHS: 15.3,
  USD_ZAR: 18.2,
  USD_XAF: 613,
  EUR_USD: 1.09,
  GBP_USD: 1.27,
  CNY_USD: 0.138,
  INR_USD: 0.012,
  SGD_USD: 0.74,
  CAD_USD: 0.73,
};
