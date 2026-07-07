import admin from "firebase-admin";

// Initialize admin SDK once
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      // Fallback to default credentials if parsing fails
      admin.initializeApp();
    }
  } else {
    // Use application default credentials if available
    admin.initializeApp();
  }
}

const adminDb = admin.firestore();

export { admin, adminDb };
