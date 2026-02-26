/**
 * firebaseAdmin.ts — canonical export file for Firebase Admin SDK utilities.
 *
 * This module re-exports adminAuth and adminDb from the initialisation module
 * and provides a ready-to-use verifyFirebaseToken() helper that API routes
 * can call to authenticate incoming requests.
 *
 * Usage in API routes:
 *   import { verifyFirebaseToken } from "@/lib/firebaseAdmin";
 *
 *   const uid = await verifyFirebaseToken(req);
 *   if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

export { adminAuth, adminDb };

/**
 * Extracts and verifies the Firebase ID token from the request's
 * Authorization header ("Bearer <token>").
 *
 * Returns the decoded UID string on success, or null if the token is
 * missing / invalid / expired.
 *
 * @example
 *   const uid = await verifyFirebaseToken(req);
 *   if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function verifyFirebaseToken(req: NextRequest): Promise<string | null> {
  if (!adminAuth) {
    console.error("[verifyFirebaseToken] adminAuth is null — Admin SDK not initialised.");
    return null;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[verifyFirebaseToken] Missing or malformed Authorization header.");
    return null;
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    console.warn("[verifyFirebaseToken] Empty Bearer token.");
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (err) {
    console.error("[verifyFirebaseToken] verifyIdToken failed:", (err as { code?: string; message?: string })?.code, (err as { message?: string })?.message);
    return null;
  }
}

/**
 * Same as verifyFirebaseToken but also returns the full decoded token
 * so callers can access email, name, and custom claims.
 */
export async function verifyFirebaseTokenFull(
  req: NextRequest
): Promise<import("firebase-admin/auth").DecodedIdToken | null> {
  if (!adminAuth) return null;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;

  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}
