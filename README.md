# BuySell Marketplace

The modern, seamless marketplace connecting wholesalers, retailers, and buyers in one unified platform.

## 🚀 Features

- **Authentication System**: Firebase-powered Login and Registration with multi-profile support (Wholesaler, Retailer, Buyer).
- **Core Architecture**: Role-based access control and dynamic dashboard views.
- **Marketplace**: High-performance catalog browsing with search and category filtering.
- **Paystack Integration**: Secure checkout for direct purchases and wholesale transactions.
- **Responsive & Premium UI**: Glassmorphism design system using Tailwind CSS and Framer Motion.

## 🛠️ Tech Stack

- **Next.js 15+** (App Router)
- **Firebase** (Auth, Firestore, Storage)
- **Tailwind CSS** (Modern styling)
- **Paystack** (Payment gateway)
- **Lucide & Framer Motion** (Aesthetics and Interactions)

## 📁 Key Routes

- `/`: Landing page with hero and features.
- `/login`: Secure user authentication.
- `/register`: Profile-based account creation.
- `/marketplace`: Product discovery and purchasing.
- `/dashboard`: Role-specific management interface.

## 🧪 Environmental Setup

Create a `.env.local` file with the following keys:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_key
```

## 🚀 Getting Started

First, install dependencies:
```bash
npm install
```

Then, run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.
