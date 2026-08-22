"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AISourcingAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 p-3.5 sm:p-4 rounded-full bg-gradient-to-r from-primary via-purple-600 to-indigo-600 text-white shadow-2xl shadow-primary/40 flex items-center gap-2 font-bold text-xs sm:text-sm"
        aria-label="Open AI Sourcing Assistant"
      >
        <Sparkles size={20} className="animate-pulse" />
        <span className="hidden sm:inline">AI Agent</span>
      </motion.button>

      {/* Expandable Chat Drawer using the AI Agent Iframe */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[450px] h-[650px] max-h-[80vh] bg-card rounded-[18px] border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Close Button overlay */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground bg-card/80 hover:bg-muted transition-all z-10 shadow-sm backdrop-blur-sm border border-border"
              title="Close Chat"
            >
              <X size={18} />
            </button>
            
            <iframe 
              src="https://buysell-ai-agent-production.up.railway.app/widget" 
              className="w-full h-full border-none"
              style={{ border: "none" }}
              title="BuySell AI Agent"
              allow="clipboard-write"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
