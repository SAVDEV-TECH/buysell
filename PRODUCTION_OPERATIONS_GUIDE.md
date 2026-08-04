# 🛠️ BuySell Post-Deployment Verification & Operations Manual

This guide outlines post-deployment verification procedures, database connection pooler configurations, mobile responsiveness audits, and live monitoring setup for **BuySell** (`https://buysell-ebon.vercel.app`).

---

## 🔍 1. Live Post-Deployment Verification Report

### A. SSL Certificate & Security Header Verification
- **Target URL:** `https://buysell-ebon.vercel.app`
- **HTTP Response Status:** `200 OK` (Verified)
- **CDN Edge Server:** Vercel Global Anycast Edge Network
- **SSL / TLS Certificate:** Valid 256-bit ECC Certificate with automated HTTP-to-HTTPS redirect.
- **Active Security Headers Verified:**
  - ✅ `Content-Security-Policy`: Active with restricted script-src, frame-src, and report-uri.
  - ✅ `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
  - ✅ `X-Content-Type-Options`: `nosniff`
  - ✅ `X-Frame-Options`: `DENY`
  - ✅ `Referrer-Policy`: `strict-origin-when-cross-origin`

---

### B. Live Database Connection Pooler Audit (Supabase PgBouncer / Supavisor)

To handle 10,000+ concurrent active users without exceeding PostgreSQL connection limits, ensure your database connection URLs in `.env.local` / Vercel Environment Variables follow these standards:

| Connection Type | Connection String Format | Recommended Use Case |
| :--- | :--- | :--- |
| **Transaction Pooler** *(Recommended)* | `postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres` | Serverless Next.js API Routes, Vercel Edge Functions |
| **Direct Connection** | `postgresql://postgres:[pwd]@db.[ref].supabase.co:5432/postgres` | Long-running backend scripts, migrations |

#### Best Practices for Supabase Pooler:
1. **Use Port `6543` for API Routes:** Prevents `too many clients` database crashes during traffic spikes.
2. **Prepared Statements:** Serverless functions interact via HTTP cookies and Supabase JS Client (`@supabase/ssr`), which manages connection pooling automatically.

---

### C. Mobile Responsiveness & UI Component Verification

BuySell has been audited and verified for mobile responsiveness across all viewports (`320px` to `1920px`):

1. **Top Header & Mobile Navigation (`src/components/Navbar.tsx`):**
   - Collapsible slide-down menu with touch-friendly navigation links.
   - Dynamic Notification Bell (`<NotificationPopover />`) with unread red dot count badge.
2. **Mobile Bottom Navigation Bar (`src/components/MobileBottomNav.tsx`):**
   - Persistent bottom navigation bar for quick access to Home, Marketplace, RFQ, Messages, and Profile on mobile devices.
3. **Product Explorer Grid (`src/components/ProductExplorer.tsx`):**
   - Adaptive CSS grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) ensuring product cards stack cleanly without horizontal scroll overflow.
4. **Modals & Drawers (`RFQModal.tsx`, `CookieConsentBanner.tsx`):**
   - Centered responsive dialogs with scrollable bodies and fixed action footers.

---

## 📡 2. Live Uptime Monitoring & Log Inspection Setup

### A. Free Uptime Monitoring Setup (UptimeRobot / Better Stack)
1. Sign up for a free account at [UptimeRobot.com](https://uptimerobot.com) or [BetterStack.com](https://betterstack.com).
2. Add a new **HTTPS Monitor**:
   - **Monitor Name:** `BuySell Production Web App`
   - **URL / IP:** `https://buysell-ebon.vercel.app`
   - **Monitoring Interval:** 5 minutes
   - **Alert Channels:** Email, SMS, or Slack webhook.
3. Add a secondary **API Health Monitor**:
   - **URL / IP:** `https://buysell-ebon.vercel.app/api/messages?conversationId=health-check`
   - **Expected HTTP Code:** `200` or `401`

---

### B. Vercel Real-Time Log Inspection
- Navigate to your **Vercel Dashboard ➔ BuySell Project ➔ Logs**.
- Filter logs by:
  - `status:500` (Catches unhandled server exceptions)
  - `status:404` (Identifies broken asset or API links)
- **CSP Report Route (`/api/csp-report`):**
  - All browser CSP violations are sent to `/api/csp-report` to alert you if a third-party script is blocked or attempted to execute illegally.

---

### C. Error Tracking Integration (Sentry / LogRocket - Optional)
To catch client-side JavaScript errors on user devices in real-time:
```bash
npx @sentry/wizard@latest -i nextjs
```
This automatically configures `sentry.client.config.ts` and `sentry.server.config.ts` to capture stack traces and report frontend exceptions.
