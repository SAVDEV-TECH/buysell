"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { detectCountry, CountryData, COUNTRY_CONFIG } from "@/lib/geolocation";

interface CurrencyContextType {
  country: CountryData;
  currency: string;
  currencySymbol: string;
  loading: boolean;
  setCountry: (countryCode: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryData>(COUNTRY_CONFIG.NG);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Detect country on mount
    const detectAndSetCountry = async () => {
      try {
        const detectedCountry = await detectCountry();
        setCountryState(detectedCountry);

        // Store preference
        if (typeof window !== "undefined") {
          localStorage.setItem("userCountry", detectedCountry.code);
        }
      } catch (error) {
        console.error("Failed to detect country:", error);
        // Use default (Nigeria)
      } finally {
        setLoading(false);
      }
    };

    detectAndSetCountry();
  }, [isHydrated]);

  const setCountry = (countryCode: string) => {
    if (COUNTRY_CONFIG[countryCode]) {
      setCountryState(COUNTRY_CONFIG[countryCode]);
      if (typeof window !== "undefined") {
        localStorage.setItem("userCountry", countryCode);
      }
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        country,
        currency: country.currencyCode,
        currencySymbol: country.currencySymbol,
        loading,
        setCountry,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
