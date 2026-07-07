"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { COUNTRY_CONFIG } from "@/lib/geolocation";

// Convert ISO 3166-1 alpha-2 country code → emoji flag
// Works natively in all modern browsers (no extra packages needed)
function countryFlag(code: string): string {
  const offset = 0x1F1E6 - 65; // 'A' = 65
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

export default function CurrencySelector() {
  const { country, setCountry } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const popularCountries = ["NG", "KE", "GH", "ZA", "UG"];
  const otherCountries = Object.keys(COUNTRY_CONFIG).filter(
    (code) => !popularCountries.includes(code)
  );

  const flag = countryFlag(country.code);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button — shows flag + currency code */}
      <button
        id="currency-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 shadow-sm"
        title="Change currency / country"
      >
        <span className="text-base leading-none" aria-hidden="true">{flag}</span>
        <span className="text-xs font-black tracking-wide">{country.currencyCode}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[200] overflow-hidden"
        >
          <div className="max-h-80 overflow-y-auto">
            {/* Popular */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-2">
                Popular
              </p>
              {popularCountries.map((code) => {
                const cfg = COUNTRY_CONFIG[code];
                const isActive = country.code === code;
                return (
                  <button
                    key={code}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setCountry(code); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left mb-0.5 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="text-xl leading-none w-7 text-center">{countryFlag(code)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-primary" : ""}`}>{cfg.name}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {cfg.currencySymbol} · {cfg.currencyCode}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-1" />

            {/* Other countries */}
            <div className="px-3 pb-3 pt-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-2">
                Other Countries
              </p>
              {otherCountries.map((code) => {
                const cfg = COUNTRY_CONFIG[code];
                const isActive = country.code === code;
                return (
                  <button
                    key={code}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setCountry(code); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left mb-0.5 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="text-xl leading-none w-7 text-center">{countryFlag(code)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-primary" : ""}`}>{cfg.name}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {cfg.currencySymbol} · {cfg.currencyCode}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
