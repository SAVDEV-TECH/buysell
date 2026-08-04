"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, MessageSquare, ListOrdered, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

const MobileBottomNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    { name: "Home", href: "/", icon: <Home size={20} /> },
    { name: "Market", href: "/marketplace", icon: <ShoppingBag size={20} /> },
    {
      name: "Messages",
      href: user ? "/dashboard/messages" : "/login?redirect=/dashboard/messages",
      icon: <MessageSquare size={20} />,
      badge: unreadCount,
    },
    {
      name: "Orders",
      href: user ? "/dashboard/orders" : "/login?redirect=/dashboard/orders",
      icon: <ListOrdered size={20} />,
    },
    {
      name: "Account",
      href: user ? "/dashboard" : "/login",
      icon: <User size={20} />,
    },
  ];

  return (
    <div
      role="navigation"
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-2 flex justify-around items-center shadow-[0_-5px_25px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.6rem)" }}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.name === "Market" && pathname.startsWith("/marketplace")) ||
          (item.name === "Messages" && pathname.startsWith("/dashboard/messages")) ||
          (item.name === "Orders" && pathname.startsWith("/dashboard/orders")) ||
          (item.name === "Account" && (pathname === "/dashboard" || pathname.startsWith("/dashboard/settings")));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 relative min-w-[56px] ${
              isActive
                ? "text-primary font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {/* Active Highlight Pill */}
            {isActive && (
              <span className="absolute -top-1 w-6 h-1 bg-primary rounded-full animate-in fade-in zoom-in duration-200" />
            )}

            <div className="relative mt-0.5">
              {item.icon}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>

            <span className="text-[10px] font-bold tracking-tight mt-1">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
