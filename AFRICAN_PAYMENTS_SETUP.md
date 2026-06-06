# African Payment Integration Setup

## Environment Variables Required

Add the following to your `.env.local` file:

### Paystack (Nigeria, Kenya, South Africa)
```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
```

### Flutterwave (34+ African Countries)
```env
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_xxxxx
```

### Mobile Money (USSD-based)
```env
# No additional keys needed - uses local USSD codes
```

## Getting API Keys

### Paystack
1. Go to https://dashboard.paystack.com/
2. Sign up or log in
3. Navigate to Settings → API Keys & Webhooks
4. Copy the keys to `.env.local`

### Flutterwave
1. Go to https://app.flutterwave.com/
2. Sign up or log in
3. Navigate to Settings → API
4. Copy the keys to `.env.local`

## Webhook Configuration

### Paystack Webhooks
Set webhook URL in Paystack dashboard:
```
https://yourdomain.com/api/webhooks/paystack
```

Choose events:
- charge.success
- charge.failed

### Flutterwave Webhooks
Set webhook URL in Flutterwave dashboard:
```
https://yourdomain.com/api/webhooks/flutterwave
```

Choose events:
- charge.completed
- charge.failed

## Testing Payments

### Test Credentials

**Paystack (Test Mode)**
- Card: 4084 0343 0000 6000
- Exp: 12/25
- CVV: 408

**Flutterwave (Test Mode)**
- Card: 5531 8866 5007 3720
- Exp: 09/32
- CVV: 564

**Mobile Money (Test)**
- Uses simulated USSD codes
- Works in demo/test environment

## Supported Countries & Methods

| Country | Paystack | Flutterwave | Mobile Money |
|---------|----------|-------------|--------------|
| Nigeria | ✅ | ✅ | ✅ |
| Kenya | ✅ | ✅ | ✅ |
| Ghana | ❌ | ✅ | ✅ |
| South Africa | ✅ | ✅ | ✅ |
| Uganda | ❌ | ✅ | ✅ |
| Tanzania | ❌ | ✅ | ✅ |
| Rwanda | ❌ | ✅ | ✅ |
| Cameroon | ❌ | ✅ | ✅ |
| Senegal | ❌ | ✅ | ✅ |
| Egypt | ❌ | ✅ | ✅ |
| ... | ... | ... | ... |

## How It Works

1. **Country Detection**: Automatically detects user's country from IP
2. **Payment Method Selection**: Recommends best method for that country
3. **Payment Processing**: Routes to appropriate gateway (Paystack/Flutterwave)
4. **Mobile Money**: Generates USSD code for simple dialing
5. **Webhook Verification**: Confirms payment status via webhooks

## Currency Support

All payments are converted to the user's local currency automatically:

- **NGN** - Nigerian Naira
- **GHS** - Ghanaian Cedi
- **KES** - Kenyan Shilling
- **UGX** - Ugandan Shilling
- **TZS** - Tanzanian Shilling
- **ZAR** - South African Rand
- **XAF** - Central African CFA Franc
- **XOF** - West African CFA Franc
- And 10+ others

## Testing Webhooks Locally

Use Stripe CLI alternative (Postman, ngrok) to test webhooks:

```bash
# Using ngrok (free tier)
ngrok http 3000

# Update webhook URLs to:
# https://xxx-xxx-xxx.ngrok.io/api/webhooks/paystack
# https://xxx-xxx-xxx.ngrok.io/api/webhooks/flutterwave
```

## Troubleshooting

**"Currency not supported"**
- Check the `COUNTRY_CONFIG` in `PaymentMethodSelector.tsx`
- Add missing country/currency mapping

**"Payment failed"**
- Verify webhook secret keys match exactly
- Check that webhook URLs are publicly accessible
- Test with test API keys first

**"USSD code not displaying"**
- Check mobile money provider availability in your region
- Verify phone number format (include country code)
- Fallback to Flutterwave if USSD not supported

## Production Checklist

- [ ] Switch from test to live API keys
- [ ] Enable production webhooks in payment provider dashboards
- [ ] Set up proper error logging and monitoring
- [ ] Enable rate limiting on webhook endpoints
- [ ] Set up database backups
- [ ] Test payment flow end-to-end
- [ ] Document support process for failed payments
- [ ] Set up SMS/email notifications for transactions
