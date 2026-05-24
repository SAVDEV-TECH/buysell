"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ListOrdered, User, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";

const MobileBottomNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems = [
    { name: "Home", href: "/", icon: <Home size={20} /> },
    { name: "Market", href: "/marketplace", icon: <ShoppingBag size={20} /> },
    { name: "Orders", href: "/dashboard/orders", icon: <ListOrdered size={20} /> },
    { name: "Account", href: "/dashboard", icon: <User size={20} /> },
  ];

  if (!user) return null;

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 px-6 py-3 flex justify-between items-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
    >
      {navItems.map((item) => (
        <Link 
          key={item.href} 
          href={item.href}
          className={`flex flex-col items-center gap-1 transition-all ${
            pathname === item.href 
              ? "text-primary scale-110" 
              : "text-muted-foreground opacity-60 hover:opacity-100"
          }`}
        >
          <div className="relative">
            {item.icon}
            {item.name === "Account" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white pointer-events-none" />
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileBottomNav;
