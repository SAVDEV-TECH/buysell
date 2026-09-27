"use client";

/**
 * src/components/MobileNav.tsx
 *
 * Native-style bottom navigation bar for BuySell on Android & iOS.
 * Renders only inside Capacitor native builds — invisible on web.
 *
 * Tab layout mirrors Alibaba / Made-in-China mobile app conventions:
 *   Home · Explore · Cart · Messages · Profile
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingCart, MessageSquare, User } from "lucide-react";
import { isNative } from "@/lib/capacitor";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export default function MobileNav() {
  const pathname = usePathname();
  const { cartItems } = useCart();
  const { user } = useAuth();
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNative());
  }, []);

  // Don't render on web — the desktop Navbar handles navigation there.
  if (!native) return null;

  const navItems: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Explore", href: "/marketplace", icon: Grid3X3 },
    {
      label: "Cart",
      href: "/checkout",
      icon: ShoppingCart,
      badge: cartItems?.length ?? 0,
    },
    {
      label: "Messages",
      href: user ? "/dashboard/messages" : "/login",
      icon: MessageSquare,
    },
    {
      label: "Profile",
      href: user ? "/dashboard" : "/login",
      icon: User,
    },
  ];

  return (
    <>
      {/* Spacer so page content isn't hidden behind the tab bar */}
      <div className="h-20 safe-area-bottom" />

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl">
        <div className="flex items-stretch h-16 safe-area-bottom">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors active:bg-muted/50 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-2.5 right-[calc(50%-14px)] min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}

                {/* Icon */}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-transform active:scale-90"
                />

                {/* Label */}
                <span className={`text-[10px] font-bold ${isActive ? "font-black" : ""}`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute bottom-1.5 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
