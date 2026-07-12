import { initializeApp, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { cert } from "firebase-admin/app";

// Initialize admin SDK once
let adminDb: any;

function initializeFirebaseAdmin() {
  const apps = getApps();
  
  if (apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (e) {
        // Fallback to default credentials if parsing fails
        initializeApp();
      }
    } else {
      // Use application default credentials if available
      initializeApp();
    }
  }
  
  // Get the Firestore instance
  adminDb = getFirestore();
}

// Initialize on first import
initializeFirebaseAdmin();

export { adminDb };
