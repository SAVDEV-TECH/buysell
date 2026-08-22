// BuySell Localized Currency & Real-time FX Rates Engine
// Standard B2B base currency: USD ($).

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  countryCode: string;
  countryName: string;
  region: "West Africa" | "East Africa" | "Central Africa" | "Southern Africa" | "North Africa" | "Europe" | "Americas" | "Asia" | "Middle East" | "Global";
  decimals: number;
}

/** Standard currency metadata for African and international trade corridors */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyMeta> = {
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", countryCode: "NG", countryName: "Nigeria", region: "West Africa", decimals: 0 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", countryCode: "US", countryName: "United States", region: "Americas", decimals: 2 },
  GHS: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭", countryCode: "GH", countryName: "Ghana", region: "West Africa", decimals: 2 },
  KES: { code: "KES", name: "Kenyan Shilling", symbol: "Ksh", flag: "🇰🇪", countryCode: "KE", countryName: "Kenya", region: "East Africa", decimals: 0 },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", countryCode: "ZA", countryName: "South Africa", region: "Southern Africa", decimals: 2 },
  EGP: { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬", countryCode: "EG", countryName: "Egypt", region: "North Africa", decimals: 2 },
  XOF: { code: "XOF", name: "West African CFA Franc", symbol: "CFA", flag: "🇹🇬", countryCode: "TG", countryName: "Togo / WAEMU", region: "West Africa", decimals: 0 },
  XAF: { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", flag: "🇨🇲", countryCode: "CM", countryName: "Cameroon / CEMAC", region: "Central Africa", decimals: 0 },
  TZS: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿", countryCode: "TZ", countryName: "Tanzania", region: "East Africa", decimals: 0 },
  UGX: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬", countryCode: "UG", countryName: "Uganda", region: "East Africa", decimals: 0 },
  RWF: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", flag: "🇷🇼", countryCode: "RW", countryName: "Rwanda", region: "East Africa", decimals: 0 },
  MAD: { code: "MAD", name: "Moroccan Dirham", symbol: "د.م.", flag: "🇲🇦", countryCode: "MA", countryName: "Morocco", region: "North Africa", decimals: 2 },
  ETB: { code: "ETB", name: "Ethiopian Birr", symbol: "Br", flag: "🇪🇹", countryCode: "ET", countryName: "Ethiopia", region: "East Africa", decimals: 2 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", countryCode: "CA", countryName: "Canada", region: "Americas", decimals: 2 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", countryCode: "GB", countryName: "United Kingdom", region: "Europe", decimals: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", countryCode: "EU", countryName: "European Union", region: "Europe", decimals: 2 },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", countryCode: "CN", countryName: "China", region: "Asia", decimals: 2 },
  AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", countryCode: "AE", countryName: "United Arab Emirates", region: "Middle East", decimals: 2 },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", countryCode: "IN", countryName: "India", region: "Asia", decimals: 2 },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", countryCode: "JP", countryName: "Japan", region: "Asia", decimals: 0 },
  BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", countryCode: "BR", countryName: "Brazil", region: "Americas", decimals: 2 },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", countryCode: "AU", countryName: "Australia", region: "Global", decimals: 2 },
};

/** Central Bank & Market Benchmark Fallback Rates (USD Base = 1.0) */
export const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  GHS: 15.5,
  KES: 129.5,
  ZAR: 18.2,
  EGP: 48.5,
  XOF: 605.0,
  XAF: 605.0,
  TZS: 2600.0,
  UGX: 3700.0,
  RWF: 1350.0,
  MAD: 10.1,
  ETB: 120.0,
  CAD: 1.38,
  GBP: 0.79,
  EUR: 0.92,
  CNY: 7.24,
  AED: 3.67,
  INR: 83.5,
  JPY: 155.0,
  BRL: 5.65,
  AUD: 1.52,
};

/** Country code to preferred currency code mapping */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  EG: "EGP",
  TG: "XOF",
  GW: "XOF",
  CI: "XOF",
  SN: "XOF",
  CM: "XAF",
  TZ: "TZS",
  UG: "UGX",
  RW: "RWF",
  MA: "MAD",
  ET: "ETB",
  CA: "CAD",
  GB: "GBP",
  US: "USD",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  CN: "CNY",
  AE: "AED",
  IN: "INR",
  JP: "JPY",
  BR: "BRL",
  AU: "AUD",
};

const FX_CACHE_KEY = "buysell_fx_rates_v1";
const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

interface CachedRates {
  timestamp: number;
  rates: Record<string, number>;
}

/** Fetches real-time FX exchange rates with fallback to reliable cached/benchmark rates */
export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  if (typeof window !== "undefined") {
    try {
      const cachedStr = localStorage.getItem(FX_CACHE_KEY);
      if (cachedStr) {
        const cached: CachedRates = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < FX_CACHE_TTL_MS && cached.rates) {
          return { ...DEFAULT_USD_RATES, ...cached.rates };
        }
      }
    } catch {
      // Ignore cache parse error
    }
  }

  try {
    // Open-access, highly available exchange rate endpoint
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const mergedRates: Record<string, number> = { ...DEFAULT_USD_RATES };
        for (const [curr, rate] of Object.entries(data.rates)) {
          if (typeof rate === "number" && rate > 0) {
            mergedRates[curr] = rate;
          }
        }

        if (typeof window !== "undefined") {
          try {
            const cachePayload: CachedRates = {
              timestamp: Date.now(),
              rates: mergedRates,
            };
            localStorage.setItem(FX_CACHE_KEY, JSON.stringify(cachePayload));
          } catch {
            // Ignore storage quota error
          }
        }
        return mergedRates;
      }
    }
  } catch (err) {
    console.warn("BuySell FX live rates sync notice: Using benchmark rates.", err);
  }

  return DEFAULT_USD_RATES;
}

/** Convert a USD price to a specific target currency */
export function convertUsdPrice(
  amountInUsd: number,
  targetCurrency: string,
  rates: Record<string, number> = DEFAULT_USD_RATES
): number {
  if (!amountInUsd || isNaN(amountInUsd)) return 0;
  if (targetCurrency === "USD") return amountInUsd;

  const rate = rates[targetCurrency] || DEFAULT_USD_RATES[targetCurrency] || 1;
  const converted = amountInUsd * rate;

  const meta = SUPPORTED_CURRENCIES[targetCurrency];
  if (meta && meta.decimals === 0) {
    return Math.round(converted);
  }
  return Number(converted.toFixed(2));
}

/** Formats a monetary number into standard locale display */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string
): string {
  const meta = SUPPORTED_CURRENCIES[currencyCode];
  const symbol = meta ? meta.symbol : currencyCode;
  const decimals = meta ? meta.decimals : 2;

  const formattedNum = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol}${formattedNum} ${currencyCode}`;
}

/** Compact dual price object for UI components */
export interface DualPriceInfo {
  /** Original base USD price formatted, e.g. "$50 USD" */
  originalUsd: string;
  /** Numerical value in USD */
  rawUsd: number;
  /** Converted price formatted, e.g. "₦75,000 NGN" or null if target is USD */
  converted: string | null;
  /** Converted numerical value */
  rawConverted: number | null;
  /** Short conversion badge, e.g. "≈ ₦75,000 NGN" */
  conversionLabel: string | null;
  /** Target currency code */
  targetCurrency: string;
  /** Rate used for conversion, e.g. 1500 */
  rateUsed: number;
  /** True when selected currency is different from USD */
  hasConversion: boolean;
  /** Regulatory and trade transparency notice */
  disclaimer: string;
}

/** Computes the standard dual pricing format */
export function computeDualPrice(
  amountInUsd: number,
  targetCurrency: string,
  rates: Record<string, number> = DEFAULT_USD_RATES,
  unitLabel?: string
): DualPriceInfo {
  const safeUsd = typeof amountInUsd === "number" && !isNaN(amountInUsd) ? amountInUsd : 0;
  const unitSuffix = unitLabel ? ` / ${unitLabel}` : "";
  const originalUsd = `$${safeUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD${unitSuffix}`;

  const isUsd = targetCurrency === "USD";
  const rate = rates[targetCurrency] || DEFAULT_USD_RATES[targetCurrency] || 1;
  const rawConverted = convertUsdPrice(safeUsd, targetCurrency, rates);

  const meta = SUPPORTED_CURRENCIES[targetCurrency];
  const symbol = meta?.symbol || targetCurrency;
  const decimals = meta?.decimals ?? 2;

  const formattedConverted = `${symbol}${rawConverted.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${targetCurrency}${unitSuffix}`;

  const disclaimer = `Estimated conversion (1 USD ≈ ${symbol}${rate.toLocaleString()} ${targetCurrency}). Final contract settlement is processed in USD or agreed supplier base currency.`;

  return {
    originalUsd,
    rawUsd: safeUsd,
    converted: isUsd ? null : formattedConverted,
    rawConverted: isUsd ? null : rawConverted,
    conversionLabel: isUsd ? null : `≈ ${formattedConverted}`,
    targetCurrency,
    rateUsed: rate,
    hasConversion: !isUsd,
    disclaimer,
  };
}
