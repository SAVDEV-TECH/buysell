import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  attemptWindowMs: 15 * 60 * 1000, // 15 minutes
};

interface LoginAttempt {
  email: string;
  timestamp?: number;
  locked?: boolean;
  lockedUntil?: number;
  attempts?: number[];
  firstAttemptTime?: number;
  lastAttemptTime?: number;
  lastSuccessfulLogin?: number;
}

/**
 * Check if a login attempt should be rate-limited
 * Returns { allowed: boolean, remainingAttempts: number, lockedUntil?: number }
 */
export const checkLoginRateLimit = functions.https.onCall(
  async (data: { email: string }, context) => {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    const docRef = db.collection("loginAttempts").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return {
        allowed: true,
        remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      };
    }

    const data_val = doc.data() as LoginAttempt;
    const now = Date.now();

    // Check if account is locked
    if (data_val.locked && data_val.lockedUntil && now < data_val.lockedUntil) {
      throw new functions.https.HttpsError(
        "permission-denied",
        `Account temporarily locked. Try again in ${Math.ceil((data_val.lockedUntil - now) / 1000 / 60)} minutes.`
      );
    }

    // Clean up expired lock
    if (data_val.locked && data_val.lockedUntil && now >= data_val.lockedUntil) {
      await docRef.update({ locked: false, lockedUntil: null, attempts: [] });
      return {
        allowed: true,
        remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      };
    }

    // Count recent attempts
    const attempts = (data_val.attempts || []) as number[];
    const recentAttempts = attempts.filter(
      (ts) => now - ts < RATE_LIMIT_CONFIG.attemptWindowMs
    );

    if (recentAttempts.length >= RATE_LIMIT_CONFIG.maxAttempts) {
      // Lock the account
      const lockedUntil = now + RATE_LIMIT_CONFIG.lockoutDurationMs;
      await docRef.update({
        locked: true,
        lockedUntil,
        lastLockTime: now,
      });

      throw new functions.https.HttpsError(
        "permission-denied",
        "Too many login attempts. Account locked for 15 minutes."
      );
    }

    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - recentAttempts.length,
    };
  }
);

/**
 * Record a failed login attempt
 */
export const recordLoginFailure = functions.https.onCall(
  async (data: { email: string }, context) => {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    const docRef = db.collection("loginAttempts").doc(email);
    const doc = await docRef.get();
    const now = Date.now();

    if (!doc.exists) {
      await docRef.set({
        email,
        attempts: [now],
        locked: false,
        firstAttemptTime: now,
        lastAttemptTime: now,
      });
    } else {
      const data_val = doc.data() as LoginAttempt;
      const attempts = (data_val.attempts || []) as number[];

      // Clean up old attempts outside the window
      const recentAttempts = attempts.filter(
        (ts) => now - ts < RATE_LIMIT_CONFIG.attemptWindowMs
      );

      await docRef.update({
        attempts: [...recentAttempts, now],
        lastAttemptTime: now,
      });
    }

    return { success: true };
  }
);

/**
 * Clear login attempts for a user (called on successful login)
 */
export const clearLoginAttempts = functions.https.onCall(
  async (data: { email: string }, context) => {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    await db.collection("loginAttempts").doc(email).set(
      {
        email,
        attempts: [],
        locked: false,
        lastSuccessfulLogin: Date.now(),
      },
      { merge: true }
    );

    return { success: true };
  }
);

/**
 * Record successful login event for audit logging
 */
export const recordLoginSuccess = functions.https.onCall(
  async (data: { email: string; uid: string }, context) => {
    const { email, uid } = data;

    if (!email || !uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and UID are required"
      );
    }

    const now = new Date();
    await db.collection("auditLogs").add({
      event: "LOGIN_SUCCESS",
      userId: uid,
      email,
      timestamp: now,
      ipAddress: context.rawRequest?.ip || "unknown",
      userAgent: context.rawRequest?.headers?.["user-agent"] || "unknown",
    });

    return { success: true };
  }
);

/**
 * Clean up old login attempt records (runs periodically)
 */
export const cleanupOldLoginAttempts = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const snapshot = await db
      .collection("loginAttempts")
      .where("lastAttemptTime", "<", cutoffTime)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return `Cleaned up ${snapshot.size} old login attempt records`;
  });
