"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES, CurrencyMeta } from "@/lib/exchangeRates";
import { Search, ChevronDown, Check, Globe } from "lucide-react";

export default function CurrencySelector() {
  const { currency, currencySymbol, setCurrency, exchangeRates } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const allCurrencies = useMemo(() => Object.values(SUPPORTED_CURRENCIES), []);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return allCurrencies;
    const q = searchQuery.toLowerCase().trim();
    return allCurrencies.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [allCurrencies, searchQuery]);

  const activeMeta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;

  return (
    <div ref={ref} className="relative inline-block text-left">
      {/* ── Selector Trigger Button ── */}
      <button
        id="currency-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-card hover:bg-muted/80 transition-all text-xs font-bold text-foreground shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        title="Select Display Currency"
      >
        <span className="text-base leading-none" aria-hidden="true">
          {activeMeta.flag}
        </span>
        <span className="font-extrabold tracking-wide text-foreground">
          {activeMeta.code} ({activeMeta.symbol})
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* ── Dropdown Modal / Popover ── */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-card border border-border rounded-2xl shadow-2xl z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header & Search Bar */}
          <div className="p-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe size={13} className="text-primary" /> Display Currency
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Base: USD ($)
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or currency (e.g. NGN, CAD, Ghana)..."
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Currency List */}
          <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-border/30">
            {filteredCurrencies.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground font-medium">
                No currencies matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCurrencies.map((c: CurrencyMeta) => {
                const isActive = currency === c.code;
                const rate = exchangeRates[c.code] || 1;

                return (
                  <button
                    key={c.code}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setCurrency(c.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="text-2xl leading-none w-7 text-center shrink-0">
                      {c.flag}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold truncate">
                          {c.countryName}
                        </p>
                        <span className="text-[11px] font-black tracking-wide shrink-0">
                          {c.code} ({c.symbol})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span className="truncate">{c.name}</span>
                        {c.code !== "USD" && (
                          <span className="font-mono shrink-0 ml-1">
                            1 USD ≈ {c.symbol}{rate.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <Check size={16} className="text-primary shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground leading-tight">
            💡 Local prices are converted for buyer estimation. Final supplier transactions are settled in USD.
          </div>
        </div>
      )}
    </div>
  );
}
