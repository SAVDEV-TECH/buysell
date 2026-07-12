import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';

// Initialize admin in the functions entrypoint (avoid re-init if already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

let db = admin.firestore();
let axiosClient = axios;

export function setFirestore(firestore: FirebaseFirestore.Firestore) {
  db = firestore;
}

export function setAxiosClient(client: typeof axios) {
  axiosClient = client;
}

// Paystack secrets: prefer using Secret Manager or firebase functions config
// Examples:
//  - process.env.PAYSTACK_SECRET_KEY
//  - functions.config().paystack.key
//  - process.env.PAYSTACK_WEBHOOK_SECRET
// Store real secrets in Secret Manager and inject into functions environment during deploy.
function getPaystackConfig() {
  const key = process.env.PAYSTACK_SECRET_KEY || (functions.config && functions.config().paystack && functions.config().paystack.key);
  const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || (functions.config && functions.config().paystack && functions.config().paystack.webhook_secret);
  return { key, webhookSecret };
}

// Helper: verify Paystack webhook signature using HMAC SHA512 per Paystack docs
export function verifyPaystackSignature(req: functions.https.Request): boolean {
  const { webhookSecret } = getPaystackConfig();
  if (!webhookSecret) {
    console.warn('PAYSTACK_WEBHOOK_SECRET not configured; rejecting webhook for safety');
    return false;
  }

  // raw body is available as req.rawBody in Cloud Functions when using default bodyParser
  const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const signatureHeader = (req.headers['x-paystack-signature'] || req.headers['X-PAYSTACK-SIGNATURE']) as string | undefined;
  if (!signatureHeader) return false;

  const hmac = crypto.createHmac('sha512', webhookSecret).update(raw).digest('hex');

  try {
    // timing-safe compare of hex strings
    const a = Buffer.from(hmac, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

export const handlePaystackWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (!verifyPaystackSignature(req)) {
      res.status(400).send('invalid signature');
      return;
    }

    const event = req.body;
    const reference = event.data ? event.data.reference : null;
    const status = event.event;

    if (!reference) {
      res.status(400).send('missing reference');
      return;
    }

    const escrowsRef = db.collection('escrows');
    const q = await escrowsRef.where('paystackReference', '==', reference).limit(1).get();
    if (q.empty) {
      res.status(404).send('escrow not found');
      return;
    }

    const doc = q.docs[0];

    if (status === 'charge.success' || status === 'payment.success') {
      await doc.ref.update({
        status: 'funded',
        'timeline.fundedAt': admin.firestore.FieldValue.serverTimestamp(),
        // compute auto-release as 7 days from funded
        'timeline.autoReleaseAt': admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).send('internal error');
  }
});

// Perform a Paystack transfer for an escrow. Returns transfer identifier from Paystack.
export async function performPaystackTransfer(escrowId: string, escrow: any): Promise<string> {
  const { key } = getPaystackConfig();
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');

  const manufacturerId = escrow.manufacturerId;
  if (!manufacturerId) throw new Error('missing manufacturerId on escrow');

  const manufacturerRef = db.collection('users').doc(manufacturerId);
  const mSnap = await manufacturerRef.get();
  if (!mSnap.exists) throw new Error('manufacturer not found');
  const mData = mSnap.data() || {};

  let recipientCode = mData.paystackRecipientCode as string | undefined;

  // Helper to create recipient if we have bank details on manufacturer profile
  async function createRecipientFromBankDetails() {
    const acct = mData.bankAccount; // expected {account_number, bank_code, account_name}
    if (!acct || !acct.account_number || !acct.bank_code) return null;

    const payload = {
      type: 'nuban',
      name: acct.account_name || mData.displayName || 'Manufacturer',
      account_number: acct.account_number,
      bank_code: acct.bank_code,
      currency: 'NGN'
    };

    const res = await axios.post('https://api.paystack.co/transferrecipient', payload, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.data && res.data.status && res.data.data && res.data.data.recipient_code) {
      const code = res.data.data.recipient_code;
      // Persist recipient code to manufacturer doc for future use
      await manufacturerRef.update({ paystackRecipientCode: code });
      return code;
    }
    return null;
  }

  if (!recipientCode) {
    recipientCode = await createRecipientFromBankDetails();
  }

  if (!recipientCode) {
    throw new Error('No Paystack recipient code available for manufacturer');
  }

  // Initiate transfer
  const transferPayload = {
    source: 'balance',
    amount: escrow.amount, // amount in kobo/ngn minor unit
    recipient: recipientCode,
    reason: `Escrow release for order ${escrow.orderId || escrowId}`
  };

  const idempotencyKey = `escrow-release-${escrowId}`; // can be extended with timestamp if desired

  const transferRes = await axios.post('https://api.paystack.co/transfer', transferPayload, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    timeout: 20000
  });

  if (!transferRes.data || !transferRes.data.status) {
    throw new Error('Paystack transfer failed: ' + JSON.stringify(transferRes.data));
  }

  // Paystack may return a transfer_code or reference depending on API
  const transferData = transferRes.data.data || transferRes.data;
  const transferCode = transferData.transfer_code || transferData.reference || transferData.id || JSON.stringify(transferData);

  return transferCode;
}

export async function releaseFundsImpl(data: any, context: functions.https.CallableContext) {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can release funds');
  }

  const escrowId: string = data.escrowId;
  if (!escrowId) throw new functions.https.HttpsError('invalid-argument', 'missing escrowId');

  const escrowRef = db.collection('escrows').doc(escrowId);
  const snap = await escrowRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'escrow not found');

  const escrow = snap.data()!;
  if (escrow.status !== 'shipped') {
    throw new functions.https.HttpsError('failed-precondition', 'escrow not in shipped state');
  }

  try {
    const transferCode = await performPaystackTransfer(escrowId, escrow);

    await escrowRef.update({
      paystackTransferCode: transferCode,
      status: 'released',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, transferCode };
  } catch (err: any) {
    console.error('releaseFunds error:', err.message || err);
    throw new functions.https.HttpsError('internal', 'transfer_failed', { message: err.message || String(err) });
  }
}

export const releaseFunds = functions.https.onCall(releaseFundsImpl);

// Admin callable to retry a transfer for an escrow (useful for manual/cron retries)
export const retryTransfer = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can retry transfers');
  }

  const escrowId: string = data.escrowId;
  if (!escrowId) throw new functions.https.HttpsError('invalid-argument', 'missing escrowId');

  const escrowRef = db.collection('escrows').doc(escrowId);
  const snap = await escrowRef.get();
  if (!snap.exists) throw new functions.https.HttpsError('not-found', 'escrow not found');

  const escrow = snap.data()!;

  try {
    const transferCode = await performPaystackTransfer(escrowId, escrow);
    await escrowRef.update({
      paystackTransferCode: transferCode,
      status: 'released',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRetryAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, transferCode };
  } catch (err: any) {
    console.error('retryTransfer error for', escrowId, err.message || err);
    await escrowRef.update({ lastRetryError: String(err), lastRetryAt: admin.firestore.FieldValue.serverTimestamp() });
    throw new functions.https.HttpsError('internal', 'retry_failed', { message: err.message || String(err) });
  }
});

export const autoReleaseEscrows = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const escrowsRef = db.collection('escrows');

  const q = await escrowsRef
    .where('status', '==', 'shipped')
    .where('timeline.autoReleaseAt', '<=', now)
    .limit(100)
    .get();

  const ops: Promise<any>[] = [];
  for (const doc of q.docs) {
    const escrow = doc.data();
    const escrowId = doc.id;
    // Attempt transfer but do not block the scheduled run on failures
    ops.push((async () => {
      try {
        const transferCode = await performPaystackTransfer(escrowId, escrow);
        await doc.ref.update({
          status: 'released',
          paystackTransferCode: transferCode,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error('auto-release failed for', escrowId, err);
        // Optionally mark for manual review by setting a flag like autoReleaseFailedAt
        await doc.ref.update({ autoReleaseError: String(err), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    })());
  }

  await Promise.all(ops);
  return null;
});

// Admin callable: list escrows that failed auto-release or have retry errors
export async function listFailedAutoReleasesImpl(data: any, context: functions.https.CallableContext) {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can list failed auto-releases');
  }

  const escrowsRef = db.collection('escrows');
  const results: any[] = [];
  const now = admin.firestore.Timestamp.now();

  // 1) Escrows with explicit autoReleaseError
  const q1 = await escrowsRef.where('autoReleaseError', '!=', null).limit(200).get().catch(() => ({ docs: [] } as any));
  q1.docs.forEach((d: any) => results.push({ id: d.id, data: d.data() }));

  // 2) Escrows with lastRetryError
  const q2 = await escrowsRef.where('lastRetryError', '!=', null).limit(200).get().catch(() => ({ docs: [] } as any));
  q2.docs.forEach((d: any) => results.push({ id: d.id, data: d.data() }));

  // 3) Escrows still 'shipped' and past autoReleaseAt
  const q3 = await escrowsRef
    .where('status', '==', 'shipped')
    .where('timeline.autoReleaseAt', '<=', now)
    .limit(200)
    .get()
    .catch(() => ({ docs: [] } as any));
  q3.docs.forEach((d: any) => results.push({ id: d.id, data: d.data() }));

  // Deduplicate by id
  const uniq: { [id: string]: any } = {};
  results.forEach(r => { uniq[r.id] = r.data; });

  // Map minimal fields for client
  const mapped = Object.keys(uniq).map(id => {
    const d = uniq[id];
    return {
      id,
      orderId: d.orderId || null,
      amount: d.amount || null,
      currency: d.currency || null,
      status: d.status || null,
      buyerId: d.buyerId || null,
      manufacturerId: d.manufacturerId || null,
      timeline: d.timeline || null,
      autoReleaseError: d.autoReleaseError || null,
      lastRetryError: d.lastRetryError || null,
      paystackTransferCode: d.paystackTransferCode || null
    };
  });

  return { items: mapped };
}

export const listFailedAutoReleases = functions.https.onCall(listFailedAutoReleasesImpl);
