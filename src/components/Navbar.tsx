"use client";

import Link from "next/link";
import { Search, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

const Navbar = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0f172a]"><path d="M2 20h20"/><path d="M4 20V8l4-4 4 4v12"/><path d="M12 20v-8l4-4 4 4v8"/><path d="M8 12h8"/></svg>
              <span className="font-bold text-xl tracking-tight text-[#0f172a]">BuySell</span>
            </Link>
          </div>
          
          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/manufacturers"
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0f172a] transition-colors"
            >
              <Search size={18} /> Browse
            </Link>
            <Link
              href="/dashboard/messages"
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0f172a] transition-colors relative"
            >
              <MessageSquare size={18} /> Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Link>
          </nav>
          
          {/* Desktop Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user.displayName ? user.displayName.charAt(0) : user.email?.charAt(0) || "U"}
                  </div>
                  <span className="text-sm font-semibold text-[#0f172a] hidden sm:block">
                    {user.displayName || user.email?.split('@')[0] || "User"}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-semibold text-[#0f172a] hover:text-[#0f172a]/80">
                  Log in
                </Link>
                <Link href="/register" className="text-sm font-semibold text-white bg-[#0f172a] hover:bg-[#0f172a]/90 px-4 py-2 rounded-md transition-colors">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
