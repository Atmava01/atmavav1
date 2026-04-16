/**
 * Firebase Client SDK — singleton initialization
 *
 * Troubleshooting "auth/network-request-failed" in local dev:
 *  1. Firebase Console → Authentication → Settings → Authorized domains
 *     → Add "localhost"  (required for Auth to work on localhost)
 *  2. Make sure no browser extension (uBlock, Privacy Badger, VPN) blocks
 *     https://identitytoolkit.googleapis.com or https://firestore.googleapis.com
 *  3. Run: firebase login && firebase projects:list  to confirm project access
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth }                         from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ── Config ───────────────────────────────────────────────────────────────────
// These are public client-side keys — safe to commit / expose in the browser.
const firebaseConfig = {
  apiKey:            "AIzaSyDioAYL6oN7i4IYhfnDX0j_GVjlFmYuNX4",
  authDomain:        "atmava-d5c11.firebaseapp.com",
  projectId:         "atmava-d5c11",
  storageBucket:     "atmava-d5c11.firebasestorage.app",
  messagingSenderId: "182467209035",
  appId:             "1:182467209035:web:533f99a3f8007c0156eace",
  measurementId:     "G-X8VE20LEWZ",
};

// ── Singleton app ─────────────────────────────────────────────────────────────
// getApps() returns [] before first init, preventing double-initialization
// across HMR reloads in Next.js dev mode.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = getAuth(app);

// ── Firestore ─────────────────────────────────────────────────────────────────
// We use memoryLocalCache() to disable IndexedDB persistence.
// Why: the default persistentLocalCache (IndexedDB) can cause stale "offline"
// errors in development when the cache diverges from the live DB.
// Trade-off: no offline support — acceptable for this SaaS app.
//
// initializeFirestore() throws if called twice for the same app, so we catch
// the "already initialized" error and fall back to getFirestore().
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    // Firestore already initialized (e.g. HMR or multiple module evaluations)
    return getFirestore(app);
  }
})();

// ── Storage ───────────────────────────────────────────────────────────────────
export const storage = getStorage(app);

export default app;
