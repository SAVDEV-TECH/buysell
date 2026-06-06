"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { COUNTRY_CONFIG } from "@/lib/geolocation";
import { motion, AnimatePresence } from "framer-motion";

export default function CurrencySelector() {
  const { country, setCountry } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  // Popular countries first, then rest
  const popularCountries = ["NG", "KE", "GH", "ZA", "UG"];
  const otherCountries = Object.keys(COUNTRY_CONFIG).filter(
    (code) => !popularCountries.includes(code)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
        title="Change currency/country"
      >
        <Globe size={18} />
        <span className="hidden sm:inline">{country.currencyCode}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-64 bg-background border border-borderline rounded-xl shadow-lg z-50"
          >
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              <p className="text-xs font-bold text-muted-foreground uppercase px-2 mb-3">
                Popular
              </p>
              {popularCountries.map((code) => {
                const cfg = COUNTRY_CONFIG[code];
                return (
                  <button
                    key={code}
                    onClick={() => {
                      setCountry(code);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      country.code === code
                        ? "bg-primary/20 text-primary font-bold"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{cfg.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cfg.currencySymbol} {cfg.currencyCode}
                        </p>
                      </div>
                      {country.code === code && (
                        <span className="text-primary">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}

              <p className="text-xs font-bold text-muted-foreground uppercase px-2 mt-4 mb-3">
                Other Countries
              </p>
              {otherCountries.map((code) => {
                const cfg = COUNTRY_CONFIG[code];
                return (
                  <button
                    key={code}
                    onClick={() => {
                      setCountry(code);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      country.code === code
                        ? "bg-primary/20 text-primary font-bold"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cfg.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cfg.currencySymbol} {cfg.currencyCode}
                        </p>
                      </div>
                      {country.code === code && (
                        <span className="text-primary">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
