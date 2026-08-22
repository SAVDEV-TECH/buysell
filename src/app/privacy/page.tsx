"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Database, 
  Eye, 
  Lock, 
  Cookie,
  UserCheck,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

const Sections = [
  {
    id: "collection",
    icon: <Database size={24} className="text-primary" />,
    title: "1. Information Collection",
    content: "As a B2B platform, we collect business-critical information necessary for account verification and transactions. This includes your company name, registration numbers, tax IDs, business address, and primary contact details (name, work email, phone number). For payments and payouts, we securely collect and transmit financial data to our authorized payment processors (e.g., Paystack). We also automatically collect metadata such as IP addresses, browser types, and interaction logs for security auditing.",
    color: "bg-primary/10",
    border: "border-primary/20"
  },
  {
    id: "usage",
    icon: <Eye size={24} className="text-secondary" />,
    title: "2. How Information is Used",
    content: "The data we collect is strictly used to facilitate and secure your B2B transactions. Specifically, we use it to: (a) Verify the legitimacy of businesses joining the platform; (b) Process orders, payments, and freight logistics; (c) Enforce Role-Based Access Control (RBAC) across your organization's accounts; (d) Communicate critical updates, compliance notices, and order statuses; and (e) Improve our platform's user experience and algorithmic matching.",
    color: "bg-primary/5",
    border: "border-primary/20"
  },
  {
    id: "sharing",
    icon: <UserCheck size={24} className="text-blue-500" />,
    title: "3. Data Sharing & Disclosure",
    content: "We do not sell your data. We only share information with trusted third parties necessary to execute your business operations. This includes: payment gateways (for processing transactions), logistics and freight partners (for fulfillment), and identity verification services. In the context of a transaction, necessary contact and shipping information is shared between the specific Manufacturer and Wholesaler involved. We may also disclose data if required by law or to protect against fraud.",
    color: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    id: "security",
    icon: <Lock size={24} className="text-emerald-500" />,
    title: "4. Security Measures",
    content: "Security is our highest priority. We enforce Multi-Factor Authentication (MFA) via TOTP or Email OTP for all accounts. All data in transit and at rest is encrypted using industry-standard protocols. We maintain immutable audit logs of all sensitive actions (e.g., role changes, password resets). Our infrastructure employs strict session management, HTTP-only cookies, and protections against SQL Injection, XSS, and CSRF attacks.",
    color: "bg-emerald-500/10",
    border: "border-emerald-500/20"
  },
  {
    id: "cookies",
    icon: <Cookie size={24} className="text-orange-500" />,
    title: "5. Cookies & Tracking",
    content: "We use essential cookies to maintain secure sessions, remember your login state, and enforce security policies (like CSRF tokens). We also use performance and analytics cookies to understand how our platform is used, allowing us to optimize load times and interface layouts. You can control cookie preferences through your browser, though disabling essential cookies will prevent you from accessing the authenticated dashboard.",
    color: "bg-orange-500/10",
    border: "border-orange-500/20"
  },
  {
    id: "rights",
    icon: <ShieldCheck size={24} className="text-purple-500" />,
    title: "6. User & Business Rights",
    content: "Depending on your jurisdiction, you have the right to access, correct, export, or delete your personal and business data. Organization Owners can manage most data directly through the Dashboard Settings. For complete account deletion or specific data inquiries, please contact our compliance team. Note that we may be legally required to retain certain transaction records and immutable audit logs even after account deletion.",
    color: "bg-purple-500/10",
    border: "border-purple-500/20"
  }
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 bg-background overflow-hidden selection:bg-primary/30">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 relative">
        
        {/* Navigation */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        {/* Header */}
        <div className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest rounded-full mb-6"
          >
            <ShieldCheck size={16} /> Data Protection
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
          >
            Privacy Policy
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl"
          >
            At BuySell, we are committed to protecting the privacy and security of the businesses that trade on our platform. This policy outlines how we collect, use, and safeguard your data.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-sm text-muted-foreground/60 font-medium"
          >
            Last Updated: July 2026
          </motion.div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 relative">
          {/* Connecting Line */}
          <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-primary/20 via-border to-transparent hidden md:block" />

          {Sections.map((section, idx) => (
            <motion.div 
              key={section.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1 }}
              className="relative md:pl-20"
            >
              {/* Timeline dot */}
              <div className={`hidden md:flex absolute left-0 top-6 w-16 h-16 -translate-x-1/2 bg-background items-center justify-center`}>
                 <div className={`w-12 h-12 ${section.color} border ${section.border} rounded-2xl flex items-center justify-center shadow-lg shadow-black/5`}>
                   {section.icon}
                 </div>
              </div>

              <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/50 hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-4 mb-6 md:hidden">
                  <div className={`w-12 h-12 ${section.color} border ${section.border} rounded-2xl flex items-center justify-center`}>
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                
                <h2 className="text-2xl font-bold mb-4 hidden md:block group-hover:text-primary transition-colors">
                  {section.title}
                </h2>
                
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Contact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 p-8 bg-card border border-primary/20 rounded-3xl text-center bg-primary/5"
        >
          <h3 className="text-xl font-bold mb-3">Questions about your privacy?</h3>
          <p className="text-muted-foreground mb-6">
            Our compliance and security team is here to help clarify any concerns regarding your business data.
          </p>
          <a 
            href="mailto:privacy@buysell.com"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Contact Privacy Team <ChevronRight size={18} />
          </a>
        </motion.div>

      </div>
    </div>
  );
}
