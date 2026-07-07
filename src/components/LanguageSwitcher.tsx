"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LOCALES, Locale } from "@/lib/translations";

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

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        id="language-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 shadow-sm"
        title="Change language"
      >
        <Globe size={15} className="text-primary shrink-0" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:block text-xs">{current.label}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              role="option"
              aria-selected={locale === loc.code}
              onClick={() => {
                setLocale(loc.code as Locale);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors text-left
                ${locale === loc.code
                  ? "bg-primary/5 text-primary"
                  : "text-slate-700 hover:bg-slate-50"
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
