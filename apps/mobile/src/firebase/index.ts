import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    const config = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };
    app = getApps().length ? getApps()[0]! : initializeApp(config);
    auth = getAuth(app);
    storage = getStorage(app);
  }
  return app;
}

export async function signInWithFirebaseEmail(email: string, password: string) {
  getFirebaseApp();
  if (!auth) throw new Error('Firebase Auth not configured');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutFirebase() {
  if (!auth) return;
  await signOut(auth);
}

/** Stub: future invoice PDF upload path */
export function getInvoiceStorage() {
  getFirebaseApp();
  return storage;
}

/** Stub: FCM token registration placeholder */
export async function registerForPushStub(): Promise<{ enabled: boolean }> {
  if (!isFirebaseConfigured()) {
    return { enabled: false };
  }
  // Full FCM requires native config + google-services files
  return { enabled: true };
}
