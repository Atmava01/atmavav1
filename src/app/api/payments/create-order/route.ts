/**
 * POST /api/payments/create-order
 *
 * Creates a Razorpay order for a program purchase.
 * Price is resolved server-side from PROGRAM_PRICES — never trusted from the client.
 *
 * Headers:
 *   Authorization: Bearer <Firebase ID token>
 *   Content-Type: application/json
 *
 * Body:
 *   { programId: "30" | "60" | "90" }
 *
 * Response:
 *   { orderId, keyId, amount, currency, mode }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";
import { getRazorpayInstance, getRazorpayKeyId, getRazorpayMode, generateReceiptId } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  // ── 1. Guard: Admin SDK must be initialised ───────────────────────────────
  if (!adminDb) {
    console.error("[create-order] Firebase Admin SDK not initialised — check FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local and restart the dev server.");
    return NextResponse.json({ error: "Server not configured. Please contact support." }, { status: 500 });
  }
  const db = adminDb; // narrowed — safe inside async callbacks

  // ── 2. Authenticate ───────────────────────────────────────────────────────
  const uid = await verifyFirebaseToken(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized — invalid or expired token." }, { status: 401 });
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let body: { programId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { programId } = body;
  if (!programId) {
    return NextResponse.json({ error: "Missing programId." }, { status: 400 });
  }

  // ── 4. Fetch program and resolve price from Firestore ─────────────────────
  let programDoc: FirebaseFirestore.DocumentSnapshot;
  try {
    programDoc = await db.collection("programs").doc(programId).get();
  } catch (err) {
    const e = err as { code?: number; message?: string };
    console.error("[create-order] Firestore read failed:", e.code, e.message);
    if (e.code === 7) {
      return NextResponse.json(
        { error: "Server configuration error — Firestore permission denied. Check FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch program data." }, { status: 500 });
  }
  if (!programDoc.exists) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }
  const programData = programDoc.data();
  // Price stored in rupees. Razorpay requires paise (× 100). Never trusted from client.
  const priceRupees = programData?.price as number | undefined;
  const amountPaise = priceRupees ? Math.round(priceRupees * 100) : undefined;
  if (!amountPaise || amountPaise <= 0) {
    return NextResponse.json({ error: "Invalid program price." }, { status: 400 });
  }

  // ── 4. Prevent duplicate active enrollments ──────────────────────────────
  const legacyEnrollSnap = await db.collection("enrollments")
    .where("userId", "==", uid)
    .where("programId", "==", programId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!legacyEnrollSnap.empty) {
    return NextResponse.json(
      { error: "You already have an active enrollment for this program." },
      { status: 409 }
    );
  }

  // ── 5. Create Razorpay order ──────────────────────────────────────────────
  let razorpayOrder: { id: string };
  try {
    const razorpay = getRazorpayInstance();
    razorpayOrder = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  generateReceiptId(uid, programId),
    }) as { id: string };
  } catch (err) {
    console.error("[create-order] Razorpay order creation failed:", err);
    return NextResponse.json(
      { error: "Payment gateway error. Please try again." },
      { status: 502 }
    );
  }

  // ── 6. Store payment document (status: "created") ─────────────────────────
  const mode = getRazorpayMode();
  await db.collection("payments").add({
    userId:            uid,
    programId,
    razorpayOrderId:   razorpayOrder.id,
    razorpayPaymentId: null,
    amount:            amountPaise,
    status:            "created",
    mode,
    createdAt:         new Date().toISOString(),
  });

  // ── 7. Return order details to frontend ───────────────────────────────────
  return NextResponse.json({
    orderId:  razorpayOrder.id,
    keyId:    getRazorpayKeyId(),         // public — safe for frontend
    amount:   amountPaise,
    currency: "INR",
    mode,
  });
}
