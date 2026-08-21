"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { BuySellLogo } from "@/components/BuySellLogo";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-background border-t border-border pt-16 pb-28 md:pb-8 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          
          {/* Brand & Contact */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <BuySellLogo size="md" showTagline={true} />
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm leading-relaxed">
              {t("footer_tagline")}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone size={16} className="text-primary" />
                <span suppressHydrationWarning>09037624245</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail size={16} className="text-primary" />
                <span suppressHydrationWarning>savde388@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin size={16} className="text-primary" />
                <span suppressHydrationWarning>Choba, behind Ankor Hotel, Port Harcourt, Rivers State</span>
              </div>
            </div>
          </div>

          {/* Sourcing Solutions */}
          <div>
            <h4 className="font-bold text-foreground mb-6">{t("footer_sourcing")}</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_rfq")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_verified")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_wholesale")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_regional")}</Link></li>
            </ul>
          </div>

          {/* Trade Services */}
          <div>
            <h4 className="font-bold text-foreground mb-6">{t("footer_trade")}</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_assurance")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_logistics")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_monitoring")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_payment")}</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-bold text-foreground mb-6">{t("footer_care")}</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_help")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_dispute")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_policies")}</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("footer_ip")}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </Link>
            <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </Link>
            <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </Link>
            <Link href="#" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </Link>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">{t("footer_terms")}</Link>
            <span>|</span>
            <Link href="#" className="hover:text-foreground transition-colors">{t("footer_privacy")}</Link>
            <span>|</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new Event("openBuySellCookiePreferences"));
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {t("footer_cookie")}
            </button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("footer_copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
