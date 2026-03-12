/**
 * Razorpay service utility — server-side only.
 * Never import this in client components.
 *
 * Environment variables required in .env.local:
 *   RAZORPAY_KEY_ID=rzp_live_...
 *   RAZORPAY_KEY_SECRET=...
 */
import Razorpay from "razorpay";

function getKeys(): { key_id: string; key_secret: string } {
  const key_id     = process.env.RAZORPAY_KEY_ID     ?? "";
  const key_secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in .env.local");
  }
  return { key_id, key_secret };
}

/** Returns the public key ID (safe to send to the frontend for Razorpay checkout). */
export function getRazorpayKeyId(): string {
  return getKeys().key_id;
}

/** Returns the secret key (never expose to client). */
export function getRazorpayKeySecret(): string {
  return getKeys().key_secret;
}

/** Returns a fully configured Razorpay instance. */
export function getRazorpayInstance(): Razorpay {
  const { key_id, key_secret } = getKeys();
  return new Razorpay({ key_id, key_secret });
}

/** Returns the mode string stored on payment documents. */
export function getRazorpayMode(): "live" {
  return "live";
}

/**
 * Generates a unique receipt ID for a Razorpay order.
 * Format: rcpt_<8 chars of userId>_<programId>_<timestamp>
 * Max length: 40 chars (Razorpay limit).
 */
export function generateReceiptId(userId: string, programId: string): string {
  const uid = userId.slice(0, 8).replace(/[^a-zA-Z0-9]/g, "");
  const ts  = Date.now().toString(36);
  return `rcpt_${uid}_${programId}_${ts}`;
}
