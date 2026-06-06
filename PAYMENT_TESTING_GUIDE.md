# African Payment System Testing Guide

## Test Checklist

### 1. Geolocation & Currency Detection

**Desktop Test:**
- [ ] Visit homepage
- [ ] Verify currency selector appears in navbar
- [ ] Check that your country is auto-detected (NGN for Nigeria, GHS for Ghana, etc.)
- [ ] Click currency selector - verify all 16 African countries listed
- [ ] Change to different country - verify prices update immediately
- [ ] Refresh page - verify your selection persists (localStorage)

**Mobile Test:**
- [ ] Currency selector visible on mobile navbar
- [ ] Touch/click currency selector - dropdown displays properly
- [ ] Landscape/portrait orientation works

### 2. Price Conversion & Display

**Test Cases:**

1. **Nigeria (NGN)**
   - Product price: ₦500,000
   - Checkout total: ₦500,000
   - Exchange rate: 1x

2. **Ghana (GHS)**
   - Switch to Ghana
   - Same product: ~GH₵10,000 (₦500,000 ÷ 50)
   - Verify calculation: correct

3. **Kenya (KES)**
   - Switch to Kenya
   - Same product: ~Ksh100,000 (₦500,000 ÷ 5)
   - Verify calculation: correct

4. **Uganda (UGX)**
   - Switch to Uganda
   - Same product: ~USh16,700,000 (₦500,000 × 0.03)
   - Note: UGX is very large - ensure display doesn't break

### 3. Paystack Payment Flow

**Prerequisites:**
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY set in `.env.local`
- PAYSTACK_SECRET_KEY set
- Webhook URL configured: `https://yourdomain.com/api/webhooks/paystack`

**Test Steps:**
1. Add product to cart
2. Proceed to checkout
3. Select "Paystack" payment method
4. Click Paystack button
5. Use test card: `4084034300006000` / `12/25` / `408`
6. Complete payment
7. Verify success redirect to `/checkout/success`
8. Check Firestore `transactions` collection - record created with status "completed"

**Edge Cases:**
- [ ] Test declined card (use `4000000000000002`)
- [ ] Test timeout/incomplete payment
- [ ] Test webhook notification (check transaction status updates)

### 4. Flutterwave Payment Flow

**Prerequisites:**
- NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY set
- FLUTTERWAVE_SECRET_KEY set
- Webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`

**Test Steps:**
1. Add product to cart
2. Proceed to checkout
3. Select "Flutterwave" payment method
4. Click Flutterwave button
5. Use test card: `5531886650073720` / `09/32` / `564`
6. Complete payment
7. Verify success redirect
8. Check transaction record created

**Multi-currency Test:**
1. Switch country to Ghana (GHS)
2. Verify payment amount shows in GHS
3. Process payment through Flutterwave
4. Confirm conversion calculated correctly

### 5. Mobile Money Payment Flow

**Test Steps:**
1. Add product to cart
2. Proceed to checkout
3. Select "Mobile Money" payment method
4. Click Mobile Money button
5. Select provider (MTN, Airtel, Vodafone)
6. Enter phone number: `+256700000000` (Uganda format)
7. Verify USSD code displays: `*165*3*amount*0700000000#`
8. Transaction record created with status "initiated"

**Provider Tests:**
- [ ] MTN (UG): `*165*3*amount*phone#`
- [ ] Airtel (UG): `*165*3*amount*phone#`
- [ ] Vodafone (GH): Verify provider loads
- [ ] Orange Money (SN): Verify provider loads

### 6. Country-Specific Flows

**Nigeria (NG) - Paystack**
- [ ] Homepage loads, NGN selected by default
- [ ] Products show in ₦
- [ ] Payment method defaults to Paystack
- [ ] Checkout works end-to-end

**Ghana (GH) - Flutterwave/Mobile Money**
- [ ] Auto-detect as Ghana (GHS)
- [ ] Payment method defaults to Flutterwave
- [ ] Mobile Money shows as option
- [ ] Products converted to GH₵

**Uganda (UG) - Mobile Money**
- [ ] Auto-detect as Uganda (UGX)
- [ ] Payment method defaults to Mobile Money
- [ ] Large UGX amounts display correctly (no overflow)
- [ ] USSD code format correct

### 7. Rate Limiting (Security)

**Test:**
1. Attempt checkout 5+ times rapidly with same email
2. After 5 failures, verify: "Too many login attempts. Account locked for 15 minutes."
3. Wait 15 minutes (or test manually by modifying lock time in code)
4. Verify login works again

### 8. Cart & Checkout Display

**Multi-currency Display:**
1. Add multiple products
2. Switch between currencies
3. Verify:
   - [ ] All product prices convert
   - [ ] Subtotal updates
   - [ ] Taxes/fees convert (if applicable)
   - [ ] Final total displays correctly
   - [ ] Currency symbol shows throughout

### 9. Error Scenarios

**Geolocation Failure:**
- [ ] Disable location services
- [ ] Verify default (Nigeria) applied
- [ ] App still works

**Missing API Keys:**
- [ ] Remove PAYSTACK_SECRET_KEY
- [ ] Try Paystack payment
- [ ] Verify error message: "Paystack Secret Key is missing"
- [ ] Same for Flutterwave

**Network Issues:**
- [ ] Disable network (DevTools)
- [ ] Try payment
- [ ] Verify error handling (no silent failures)

**Invalid Phone Number (Mobile Money):**
- [ ] Enter: `abc123`
- [ ] Verify error: "Please enter a valid phone number"
- [ ] Enter: `123` (too short)
- [ ] Verify error
- [ ] Enter: `+256700000000` (valid)
- [ ] USSD code generates

### 10. Performance & Optimization

**Load Testing:**
- [ ] Homepage loads < 2s with geolocation
- [ ] Changing currency < 500ms
- [ ] Product prices update instantly (no lag)

**Mobile Performance:**
- [ ] Currency selector responsive on small screens
- [ ] No layout shift when prices update
- [ ] Dropdown doesn't cover content

## Manual Testing Checklist

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000

# 3. Test geolocation (open DevTools, Location: Nigeria)

# 4. Add product to cart

# 5. Go to checkout

# 6. Test each payment method
```

## Automated Test Structure (for CI/CD)

```typescript
// Example: __tests__/payments.test.ts
describe("African Payment System", () => {
  it("should detect Nigeria and default to NGN", () => {
    // Mock geolocation to Nigeria
    // Verify currency is NGN
    // Verify Paystack is default method
  });

  it("should convert prices between currencies", () => {
    // Set currency to Ghana (GHS)
    // Verify ₦500,000 = ~GH₵10,000
  });

  it("should generate valid USSD codes", () => {
    // Test mobile money
    // Verify USSD format: *165*3*amount*phone#
  });
});
```

## Production Deployment Checklist

- [ ] All API keys migrated to production environment
- [ ] Webhook URLs updated in payment provider dashboards
- [ ] Database backups configured
- [ ] Error logging & monitoring enabled (Sentry, etc.)
- [ ] Payment audit logging in place
- [ ] Rate limiting active on endpoints
- [ ] HTTPS enforced
- [ ] Test full payment flow in production
- [ ] Monitor for failed payments in first 24 hours
- [ ] Customer support process documented

## Troubleshooting

**Q: Prices not converting**
- A: Check CurrencyContext is wrapped in layout
- A: Verify geolocation.ts imports are correct
- A: Check browser localStorage (should have `userCountry`)

**Q: Mobile Money USSD code not displaying**
- A: Check phone number format includes country code
- A: Verify provider selected from dropdown
- A: Check console for JavaScript errors

**Q: Paystack webhook not triggering**
- A: Verify webhook URL is publicly accessible
- A: Check PAYSTACK_SECRET_KEY matches exact value
- A: Verify signature verification in webhook handler

**Q: Geolocation not detecting country**
- A: Service defaults to Nigeria (NGN) - is this correct?
- A: Check ipapi.co API availability
- A: Verify no content security policy blocking requests

## Success Criteria

✅ All 16 African countries supported
✅ 3 payment methods working (Paystack, Flutterwave, Mobile Money)
✅ Price conversion accurate ± 1% (rounding)
✅ Auto-detection works for 90%+ users
✅ No payment failures due to currency issues
✅ Mobile experience fully functional
✅ Rate limiting prevents abuse
✅ Webhooks verify all payments
