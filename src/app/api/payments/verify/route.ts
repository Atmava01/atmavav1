/**
 * POST /api/payments/verify
 *
 * Verifies a Razorpay payment signature, marks the payment as "paid",
 * and creates an enrollment with level + batch — redirecting to /dashboard.
 *
 * Headers:
 *   Authorization: Bearer <Firebase ID token>
 *   Content-Type: application/json
 *
 * Body:
 *   {
 *     razorpay_order_id:   string,
 *     razorpay_payment_id: string,
 *     razorpay_signature:  string,
 *     programId:           string,
 *     level?:              string,
 *     batch?:              string,
 *   }
 *
 * Response:
 *   { success: true, paymentId, programId, redirectTo: "/dashboard" }
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";
import { getRazorpayKeySecret, getRazorpayMode } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  // ── 1. Guard: Admin SDK must be initialised ───────────────────────────────
  if (!adminDb) {
    console.error("[verify] Firebase Admin SDK not initialised — check FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local and restart the dev server.");
    return NextResponse.json({ error: "Server not configured. Please contact support." }, { status: 500 });
  }

  const db = adminDb;

  // ── 2. Authenticate ───────────────────────────────────────────────────────
  const uid = await verifyFirebaseToken(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized — invalid or expired token." }, { status: 401 });
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let body: {
    razorpay_order_id?:   string;
    razorpay_payment_id?: string;
    razorpay_signature?:  string;
    programId?:           string;
    level?:               string;
    batch?:               string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    programId,
    level = "",
    batch = "",
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !programId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // ── 4. Verify Razorpay signature (HMAC-SHA256) ────────────────────────────
  let keySecret: string;
  try { keySecret = getRazorpayKeySecret(); }
  catch (err) {
    console.error("[verify] Cannot get Razorpay secret:", err);
    return NextResponse.json({ error: "Payment configuration error." }, { status: 500 });
  }

  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.warn(`[verify] Signature mismatch for order ${razorpay_order_id} uid=${uid}`);
    return NextResponse.json({ error: "Payment verification failed — invalid signature." }, { status: 400 });
  }

  // ── 5. Fetch program from Firestore ───────────────────────────────────────
  const programDoc  = await db.collection("programs").doc(programId).get();
  const programData = programDoc.data();
  const durationDays = programData?.duration ?? Number(programId) ?? 30;
  const programTitle = programData?.title
    ? `${programId} Days — ${programData.title}`
    : programId;

  // ── 6. Find payment document by orderId and userId (replay protection) ────
  const paymentQuery = await db
    .collection("payments")
    .where("razorpayOrderId", "==", razorpay_order_id)
    .where("userId", "==", uid)
    .limit(1)
    .get();

  if (paymentQuery.empty) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }

  const paymentDoc  = paymentQuery.docs[0];
  const paymentData = paymentDoc.data();

  // ── 7. Handle already-processed payment (prevent replay) ─────────────────
  if (paymentData.status === "paid") {
    const existingEnroll = await db
      .collection("enrollments")
      .where("paymentId", "==", paymentDoc.id)
      .limit(1)
      .get();

    if (existingEnroll.empty) {
      await createEnrollment(db, uid, programId, paymentDoc.id, programTitle, durationDays, level, batch);
    }

    return NextResponse.json({
      success:    true,
      paymentId:  paymentDoc.id,
      programId,
      redirectTo: "/dashboard",
      mode:       getRazorpayMode(),
    });
  }

  // ── 8. Mark payment as paid ───────────────────────────────────────────────
  await paymentDoc.ref.update({
    razorpayPaymentId: razorpay_payment_id,
    status: "paid",
  });

  // ── 9. Create enrollment ──────────────────────────────────────────────────
  await createEnrollment(db, uid, programId, paymentDoc.id, programTitle, durationDays, level, batch);

  // ── 10. Return redirect to dashboard ─────────────────────────────────────
  return NextResponse.json({
    success:    true,
    paymentId:  paymentDoc.id,
    programId,
    redirectTo: "/dashboard",
    mode:       getRazorpayMode(),
  });
}

async function createEnrollment(
  db: FirebaseFirestore.Firestore,
  uid: string,
  programId: string,
  paymentDocId: string,
  programTitle: string,
  durationDays: number,
  level: string,
  batch: string
): Promise<void> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDateObj = new Date(now);
  endDateObj.setDate(endDateObj.getDate() + durationDays);
  const endDate = endDateObj.toISOString().split("T")[0];

  await db.collection("enrollments").add({
    userId:         uid,
    programId,
    paymentId:      paymentDocId,
    status:         "active",
    startDate,
    endDate,
    level,
    batch,
    remainingDays:  durationDays,
    createdAt:      now.toISOString(),
    grantedByAdmin: false,
  });

  // Update user profile for quick access
  await db.collection("users").doc(uid).update({
    programId,
    programTitle,
    programStartDate: startDate,
    currentDay:       1,
  });
}
