"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES, Locale } from "@/lib/translations";
import { getCountryFromIP } from "@/lib/geolocation";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-detect language from IP on first load if not manually selected
  useEffect(() => {
    const hasManualPreference = localStorage.getItem("buysell_locale_set");
    if (!hasManualPreference) {
      getCountryFromIP().then((code) => {
        if (["TG", "CI", "SN", "CM", "FR", "ML", "BF", "BJ"].includes(code)) {
          setLocale("fr");
        } else if (["GW", "PT", "BR", "MZ", "AO"].includes(code)) {
          setLocale("pt");
        } else if (["CN", "TW", "HK"].includes(code)) {
          setLocale("zh");
        } else if (["SA", "AE", "EG", "MA"].includes(code)) {
          setLocale("ar");
        }
      });
    }
  }, [setLocale]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const handleSelect = (code: Locale) => {
    setLocale(code);
    localStorage.setItem("buysell_locale_set", "true");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        id="language-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
        title="Change language"
      >
        <Globe size={15} className="text-primary shrink-0" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:block text-xs">{current.label}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              role="option"
              aria-selected={locale === loc.code}
              onClick={() => handleSelect(loc.code as Locale)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left
                ${locale === loc.code
                  ? "bg-primary/5 text-primary"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <span className="text-xl leading-none">{loc.flag}</span>
              <span>{loc.label}</span>
              {locale === loc.code && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

