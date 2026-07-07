"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Locale, LOCALES, TranslationKey, translations } from "@/lib/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  dir: "ltr",
});

function applyDom(newLocale: Locale) {
  const localeConfig = LOCALES.find((l) => l.code === newLocale);
  const dir = localeConfig?.dir ?? "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = newLocale === "pidgin" ? "en-NG" : newLocale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load saved locale from localStorage on mount — runs after first render
  useEffect(() => {
    const saved = localStorage.getItem("buysell_locale") as Locale | null;
    if (saved && (["en", "pidgin", "ar", "zh"] as string[]).includes(saved)) {
      setLocaleState(saved);
      applyDom(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("buysell_locale", newLocale);
    applyDom(newLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = translations[locale] as Record<string, string>;
      const fallback = translations["en"] as Record<string, string>;
      return dict[key] ?? fallback[key] ?? key;
    },
    [locale]
  );

  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
