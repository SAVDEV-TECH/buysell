"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_USD_RATES,
  COUNTRY_TO_CURRENCY,
  CurrencyMeta,
  fetchLiveExchangeRates,
  convertUsdPrice,
  computeDualPrice,
  DualPriceInfo,
} from "@/lib/exchangeRates";
import { COUNTRY_CONFIG, CountryData } from "@/lib/geolocation";
import { useAuth } from "./AuthContext";

interface CurrencyContextType {
  /** Active country data */
  country: CountryData;
  /** Active 3-letter currency code, e.g. "NGN", "USD", "GHS", "CAD" */
  currency: string;
  /** Currency symbol, e.g. "₦", "$", "GH₵", "CA$" */
  currencySymbol: string;
  /** Detailed metadata for active currency */
  currencyMeta: CurrencyMeta;
  /** Map of live or benchmark USD FX rates */
  exchangeRates: Record<string, number>;
  /** Loading state while detecting location or fetching live rates */
  loading: boolean;
  /** Set country by 2-letter ISO code (e.g. "NG", "CA", "GB", "GH") */
  setCountry: (countryCode: string) => void;
  /** Set currency directly by 3-letter code (e.g. "NGN", "USD", "ZAR") */
  setCurrency: (currencyCode: string) => void;
  /** Convert a numerical USD amount into the active local currency */
  convertPrice: (amountInUsd: number) => number;
  /** Compute standard dual price info object (USD + Local Currency) */
  getDualPrice: (amountInUsd: number, unitLabel?: string) => DualPriceInfo;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("NGN");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("NG");
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_USD_RATES);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Mark hydration complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 2. Fetch live FX rates on mount
  useEffect(() => {
    let isMounted = true;
    fetchLiveExchangeRates()
      .then((liveRates) => {
        if (isMounted && liveRates) {
          setRates(liveRates);
        }
      })
      .catch((err) => {
        console.warn("Using fallback FX rates:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Resolve user preference on client mount (from localStorage, Auth profile, or country)
  useEffect(() => {
    if (!isHydrated) return;

    try {
      const storedCurr = localStorage.getItem("buysell_user_currency");
      const storedCountry = localStorage.getItem("buysell_user_country");

      if (storedCurr && SUPPORTED_CURRENCIES[storedCurr]) {
        setSelectedCurrency(storedCurr);
        const meta = SUPPORTED_CURRENCIES[storedCurr];
        if (meta?.countryCode) setSelectedCountryCode(meta.countryCode);
        return;
      }

      if (storedCountry && COUNTRY_CONFIG[storedCountry]) {
        setSelectedCountryCode(storedCountry);
        const mappedCurr = COUNTRY_TO_CURRENCY[storedCountry] || "USD";
        setSelectedCurrency(mappedCurr);
        return;
      }

      // If user metadata has country info, match it
      const metaCountry = (auth?.user?.user_metadata?.country as string | undefined);
      if (metaCountry) {
        const countryCode = metaCountry.toUpperCase();
        if (COUNTRY_CONFIG[countryCode]) {
          setSelectedCountryCode(countryCode);
          const mappedCurr = COUNTRY_TO_CURRENCY[countryCode] || "USD";
          setSelectedCurrency(mappedCurr);
          return;
        }
      }
    } catch {
      // Ignore local storage errors
    }
  }, [isHydrated, auth?.user?.user_metadata]);

  // Set country and sync mapped currency
  const handleSetCountry = useCallback((countryCode: string) => {
    const code = countryCode.toUpperCase();
    if (COUNTRY_CONFIG[code]) {
      setSelectedCountryCode(code);
      const mappedCurr = COUNTRY_TO_CURRENCY[code] || "USD";
      setSelectedCurrency(mappedCurr);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("buysell_user_country", code);
          localStorage.setItem("buysell_user_currency", mappedCurr);
        } catch {}
      }
    }
  }, []);

  // Set currency directly and sync matching country
  const handleSetCurrency = useCallback((currencyCode: string) => {
    const code = currencyCode.toUpperCase();
    if (SUPPORTED_CURRENCIES[code]) {
      setSelectedCurrency(code);
      const meta = SUPPORTED_CURRENCIES[code];
      if (meta?.countryCode && COUNTRY_CONFIG[meta.countryCode]) {
        setSelectedCountryCode(meta.countryCode);
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("buysell_user_currency", code);
          if (meta?.countryCode) {
            localStorage.setItem("buysell_user_country", meta.countryCode);
          }
        } catch {}
      }
    }
  }, []);

  const convertPrice = useCallback(
    (amountInUsd: number) => {
      return convertUsdPrice(amountInUsd, selectedCurrency, rates);
    },
    [selectedCurrency, rates]
  );

  const getDualPrice = useCallback(
    (amountInUsd: number, unitLabel?: string) => {
      return computeDualPrice(amountInUsd, selectedCurrency, rates, unitLabel);
    },
    [selectedCurrency, rates]
  );

  const activeCountry = useMemo(() => {
    return COUNTRY_CONFIG[selectedCountryCode] || COUNTRY_CONFIG.NG;
  }, [selectedCountryCode]);

  const currencyMeta = useMemo(() => {
    return SUPPORTED_CURRENCIES[selectedCurrency] || SUPPORTED_CURRENCIES.NGN;
  }, [selectedCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        country: activeCountry,
        currency: selectedCurrency,
        currencySymbol: currencyMeta.symbol,
        currencyMeta,
        exchangeRates: rates,
        loading,
        setCountry: handleSetCountry,
        setCurrency: handleSetCurrency,
        convertPrice,
        getDualPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
