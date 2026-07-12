Paystack & Functions deployment checklist

1. Configure Paystack credentials securely

- Use Firebase functions config (quick):
  firebase functions:config:set paystack.key="<PAYSTACK_SECRET_KEY>" paystack.webhook_secret="<PAYSTACK_WEBHOOK_SECRET>"

  After setting config, redeploy functions: firebase deploy --only functions

- Or use Google Secret Manager (recommended for production):
  - Store secrets in Secret Manager: PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET
  - Grant the Cloud Functions service account access to the secrets.
  - Set environment variables during deploy or fetch secrets in the function using Secret Manager client.

2. Environment variables

- For local emulator testing, set environment variables in your shell or use firebase functions:config:set as above.
- Example (macOS / Linux):
  export PAYSTACK_SECRET_KEY="sk_test_xxx"
  export PAYSTACK_WEBHOOK_SECRET="whsec_xxx"

3. Deploying functions

- From project root:
  cd functions
  npm install
  npm run build
  firebase deploy --only functions

- Recommended: test locally first using Emulator Suite:
  cd functions
  npm install
  firebase emulators:start --only functions,firestore,storage

4. Setting up Paystack webhook

- Configure your Paystack dashboard to send webhooks to:
  https://<REGION>-<PROJECT>.cloudfunctions.net/handlePaystackWebhook

- For local emulator testing, use ngrok to expose the emulator endpoint and set the webhook URL to the ngrok URL.
- Ensure webhook signatures are verified. The functions expect X-PAYSTACK-SIGNATURE header and will verify using PAYSTACK_WEBHOOK_SECRET.

5. Secure roles and admin claims

- Use Firebase custom claims to set admin users:
  const admin = require('firebase-admin');
  admin.auth().setCustomUserClaims(uid, { admin: true, role: 'ADMIN' });

- The security rules rely on users/{uid}.role as a fallback. Ensure the users collection is populated if you don't use custom claims.

6. Testing

- Run unit tests for functions:
  cd functions
  npm test

- Use the Emulator for integration tests of Firestore rules and Functions.

7. Notes

- Do not commit secrets into source control.
- Monitor transfer errors and failed auto-releases — the functions will write lastRetryError or autoReleaseError to the escrow document on failures.
