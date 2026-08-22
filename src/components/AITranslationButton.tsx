"use client";

import { useState } from "react";
import { Globe, Languages, Loader2, RotateCcw } from "lucide-react";

interface AITranslationButtonProps {
  originalText: string;
  onTranslated: (translatedText: string, langName: string) => void;
  onReset: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "fr", name: "French (Français)" },
  { code: "sw", name: "Swahili (Kiswahili)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "de", name: "German (Deutsch)" },
];

export default function AITranslationButton({
  originalText,
  onTranslated,
  onReset,
}: AITranslationButtonProps) {
  const [targetLang, setTargetLang] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!originalText || loading) return;

    const selectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
    const targetLanguageName = selectedLangObj?.name || targetLang;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalText,
          targetLanguage: targetLanguageName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Translation failed.");
      }

      setIsTranslated(true);
      onTranslated(data.data.translatedText, targetLanguageName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReset = () => {
    setIsTranslated(false);
    onReset();
  };

  return (
    <div className="inline-flex items-center gap-2 p-1 rounded-2xl bg-muted/80 border border-border">
      <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground">
        <Globe size={14} className="text-primary" /> Translate:
      </div>

      <select
        value={targetLang}
        onChange={(e) => setTargetLang(e.target.value)}
        disabled={loading}
        className="px-2.5 py-1 rounded-xl bg-card text-xs font-semibold border-none outline-none cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>

      {isTranslated ? (
        <button
          onClick={handleToggleReset}
          className="px-3 py-1 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted transition-all flex items-center gap-1"
        >
          <RotateCcw size={12} /> Show Original
        </button>
      ) : (
        <button
          onClick={handleTranslate}
          disabled={loading || !originalText}
          className="px-3.5 py-1 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Languages size={13} />
          )}
          Translate
        </button>
      )}

      {error && <span className="text-[10px] text-rose-500 font-semibold px-2">{error}</span>}
    </div>
  );
}
