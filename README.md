# BuySell Marketplace

The modern, seamless marketplace connecting manufacturers and wholesalers in one unified platform.

## Features

- **Authentication System**: Firebase-powered login and registration with role-based profiles (Manufacturer, Wholesaler, Admin).
- **Role-Based Dashboards**: Dynamic views for manufacturers, wholesalers, and administrators.
- **Marketplace**: Product catalog with search, category filtering, MOQ, and tiered pricing.
- **Escrow Payments**: Paystack, Flutterwave, and mobile money with escrow-backed order flow.
- **B2B Tools**: RFQs, messaging, video meetings (Jitsi), and manufacturer profiles.
- **Multi-Region Support**: Geolocation-based currency and payment method selection.
- **Responsive UI**: Tailwind CSS and Framer Motion with PWA support.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Firebase** (Auth, Firestore, Storage, Cloud Functions)
- **Tailwind CSS 4**
- **Paystack / Flutterwave** (Payment gateways)
- **Lucide & Framer Motion**

## Key Routes

- `/`: Landing page with hero and product feed.
- `/login`: Secure user authentication.
- `/register`: Role-based account creation (Manufacturer or Wholesaler).
- `/marketplace`: Product discovery and purchasing.
- `/dashboard`: Role-specific management interface.
- `/admin/dashboard`: Admin console (verification, payouts).

## Environmental Setup

Create a `.env.local` file with the following keys:

```env
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase (server)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Security Notes

- Protected routes (`/dashboard`, `/admin`, `/checkout`) require a valid Firebase session cookie.
- API routes verify the caller's Firebase ID token; client-supplied user IDs are not trusted.
- Firestore security rules enforce role-based access and escrow state transitions.
