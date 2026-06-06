// Geolocation and country/currency detection service

export interface CountryData {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  currencyCode: string;
  region: string;
  preferredPaymentMethod: "paystack" | "flutterwave" | "mobile-money";
}

export const COUNTRY_CONFIG: Record<string, CountryData> = {
  NG: {
    code: "NG",
    name: "Nigeria",
    currency: "Nigerian Naira",
    currencySymbol: "₦",
    currencyCode: "NGN",
    region: "West Africa",
    preferredPaymentMethod: "paystack",
  },
  KE: {
    code: "KE",
    name: "Kenya",
    currency: "Kenyan Shilling",
    currencySymbol: "Ksh",
    currencyCode: "KES",
    region: "East Africa",
    preferredPaymentMethod: "paystack",
  },
  GH: {
    code: "GH",
    name: "Ghana",
    currency: "Ghanaian Cedi",
    currencySymbol: "GH₵",
    currencyCode: "GHS",
    region: "West Africa",
    preferredPaymentMethod: "flutterwave",
  },
  UG: {
    code: "UG",
    name: "Uganda",
    currency: "Ugandan Shilling",
    currencySymbol: "USh",
    currencyCode: "UGX",
    region: "East Africa",
    preferredPaymentMethod: "mobile-money",
  },
  TZ: {
    code: "TZ",
    name: "Tanzania",
    currency: "Tanzanian Shilling",
    currencySymbol: "TSh",
    currencyCode: "TZS",
    region: "East Africa",
    preferredPaymentMethod: "flutterwave",
  },
  RW: {
    code: "RW",
    name: "Rwanda",
    currency: "Rwandan Franc",
    currencySymbol: "FRw",
    currencyCode: "RWF",
    region: "East Africa",
    preferredPaymentMethod: "flutterwave",
  },
  CM: {
    code: "CM",
    name: "Cameroon",
    currency: "CFA Franc",
    currencySymbol: "FCFA",
    currencyCode: "XAF",
    region: "Central Africa",
    preferredPaymentMethod: "flutterwave",
  },
  CI: {
    code: "CI",
    name: "Côte d'Ivoire",
    currency: "West African Franc",
    currencySymbol: "CFA",
    currencyCode: "XOF",
    region: "West Africa",
    preferredPaymentMethod: "flutterwave",
  },
  SN: {
    code: "SN",
    name: "Senegal",
    currency: "West African Franc",
    currencySymbol: "CFA",
    currencyCode: "XOF",
    region: "West Africa",
    preferredPaymentMethod: "flutterwave",
  },
  MA: {
    code: "MA",
    name: "Morocco",
    currency: "Moroccan Dirham",
    currencySymbol: "د.م.",
    currencyCode: "MAD",
    region: "North Africa",
    preferredPaymentMethod: "flutterwave",
  },
  EG: {
    code: "EG",
    name: "Egypt",
    currency: "Egyptian Pound",
    currencySymbol: "£",
    currencyCode: "EGP",
    region: "North Africa",
    preferredPaymentMethod: "flutterwave",
  },
  ZA: {
    code: "ZA",
    name: "South Africa",
    currency: "South African Rand",
    currencySymbol: "R",
    currencyCode: "ZAR",
    region: "Southern Africa",
    preferredPaymentMethod: "paystack",
  },
  ET: {
    code: "ET",
    name: "Ethiopia",
    currency: "Ethiopian Birr",
    currencySymbol: "Br",
    currencyCode: "ETB",
    region: "East Africa",
    preferredPaymentMethod: "mobile-money",
  },
  MW: {
    code: "MW",
    name: "Malawi",
    currency: "Malawian Kwacha",
    currencySymbol: "MK",
    currencyCode: "MWK",
    region: "Southern Africa",
    preferredPaymentMethod: "mobile-money",
  },
  ZM: {
    code: "ZM",
    name: "Zambia",
    currency: "Zambian Kwacha",
    currencySymbol: "ZK",
    currencyCode: "ZMW",
    region: "Southern Africa",
    preferredPaymentMethod: "mobile-money",
  },
  BW: {
    code: "BW",
    name: "Botswana",
    currency: "Botswana Pula",
    currencySymbol: "P",
    currencyCode: "BWP",
    region: "Southern Africa",
    preferredPaymentMethod: "flutterwave",
  },
};

// Real-time exchange rates (in production, fetch from API like Xe.com or Alpha Vantage)
export const EXCHANGE_RATES: Record<string, number> = {
  NGN: 1,
  GHS: 50,
  KES: 5,
  UGX: 0.03,
  TZS: 0.04,
  RWF: 0.08,
  XAF: 0.6,
  XOF: 0.6,
  ZAR: 20,
  MAD: 100,
  EGP: 32,
  ETB: 2,
  MWK: 0.5,
  ZMW: 18,
  BWP: 120,
  USD: 1650,
  EUR: 1800,
};

export async function detectCountry(): Promise<CountryData> {
  try {
    // Try ipapi.co first (free tier, no key required)
    const response = await fetch("https://ipapi.co/json/", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) throw new Error("Primary geolocation failed");

    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();

    if (countryCode && COUNTRY_CONFIG[countryCode]) {
      return COUNTRY_CONFIG[countryCode];
    }

    // Fallback to region detection
    const region = data.region || "Unknown";
    return getDefaultByRegion(region);
  } catch {
    // If all geolocation fails, return default (Nigeria - largest market)
    return COUNTRY_CONFIG.NG;
  }
}

function getDefaultByRegion(region: string): CountryData {
  // Smart fallbacks based on region
  const regionDefaults: Record<string, CountryData> = {
    "West Africa": COUNTRY_CONFIG.NG,
    "East Africa": COUNTRY_CONFIG.KE,
    "Central Africa": COUNTRY_CONFIG.CM,
    "Southern Africa": COUNTRY_CONFIG.ZA,
    "North Africa": COUNTRY_CONFIG.EG,
  };

  return regionDefaults[region] || COUNTRY_CONFIG.NG;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = EXCHANGE_RATES[fromCurrency] || EXCHANGE_RATES.NGN;
  const toRate = EXCHANGE_RATES[toCurrency] || EXCHANGE_RATES.NGN;

  // Convert to NGN first, then to target currency
  const inNGN = amount / fromRate;
  return Math.round(inNGN * toRate);
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  symbol: string = ""
): string {
  const symbol_to_use = symbol || getCurrencySymbol(currencyCode);

  if (["NGN", "GHS", "KES", "UGX", "TZS", "RWF", "ZAR", "MAD", "EGP", "ETB", "MWK", "ZMW", "BWP"].includes(currencyCode)) {
    return `${symbol_to_use}${amount.toLocaleString()}`;
  }

  return `${amount.toLocaleString()} ${currencyCode}`;
}

export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    NGN: "₦",
    GHS: "GH₵",
    KES: "Ksh",
    UGX: "USh",
    TZS: "TSh",
    RWF: "FRw",
    XAF: "FCFA",
    XOF: "CFA",
    ZAR: "R",
    MAD: "د.م.",
    EGP: "£",
    ETB: "Br",
    MWK: "MK",
    ZMW: "ZK",
    BWP: "P",
  };

  return symbols[currencyCode] || currencyCode;
}

export async function getCountryFromIP(): Promise<string> {
  try {
    const country = await detectCountry();
    return country.code;
  } catch {
    return "NG"; // Default fallback
  }
}

// Store user's country preference in localStorage
export function setUserCountry(countryCode: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("userCountry", countryCode);
  }
}

export function getUserCountry(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userCountry");
  }
  return null;
}

// Get country config, with localStorage preference
export function getActiveCountryConfig(): CountryData {
  const stored = getUserCountry();
  if (stored && COUNTRY_CONFIG[stored]) {
    return COUNTRY_CONFIG[stored];
  }
  return COUNTRY_CONFIG.NG; // Default
}
