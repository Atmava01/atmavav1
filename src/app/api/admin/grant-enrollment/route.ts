/**
 * POST /api/admin/grant-enrollment
 *
 * Admin-only: grants a user access to a program without payment.
 *
 * Headers:
 *   Authorization: Bearer <Firebase ID token>  (admin only)
 *   Content-Type: application/json
 *
 * Body:
 *   { userId: string, programId: string, durationDays?: number, startDate?: string, level?: string, batch?: string }
 *
 * Response:
 *   { success: true, enrollmentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const callerUid = await verifyFirebaseToken(req);
  if (!callerUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  // Verify admin role
  const callerSnap = await db.collection("users").doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin role required." }, { status: 403 });
  }

  let body: {
    userId?: string;
    programId?: string;
    durationDays?: number;
    startDate?: string;
    level?: string;
    batch?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { userId, programId, durationDays, startDate, level = "", batch = "" } = body;
  if (!userId || !programId) {
    return NextResponse.json({ error: "Missing required fields: userId, programId." }, { status: 400 });
  }

  // Verify target user exists
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Fetch program data from Firestore for title + duration
  const programDoc  = await db.collection("programs").doc(programId).get();
  const programData = programDoc.data();
  const duration    = durationDays ?? programData?.duration ?? Number(programId) ?? 30;
  const programTitle = programData?.title
    ? `${programId} Days — ${programData.title}`
    : programId;

  // Check for existing active enrollment
  // Using only equality filters to avoid needing a composite Firestore index.
  // endDate comparison is done in code instead.
  const existingQ = await db
    .collection("enrollments")
    .where("userId", "==", userId)
    .where("programId", "==", programId)
    .where("status", "==", "active")
    .get();

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const hasActive = existingQ.docs.some(d => (d.data().endDate ?? "") >= todayStr);

  if (hasActive) {
    return NextResponse.json(
      { error: "User already has an active enrollment for this program." },
      { status: 409 }
    );
  }

  // Compute dates
  const start = startDate ?? new Date().toISOString().split("T")[0];
  const startDateObj = new Date(start + "T00:00:00Z");
  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(endDateObj.getDate() + duration);
  const endDate = endDateObj.toISOString().split("T")[0];

  // Create enrollment with level, batch, remainingDays
  const enrollmentRef = await db.collection("enrollments").add({
    userId,
    programId,
    paymentId:      null,
    status:         "active",
    startDate:      start,
    endDate,
    level,
    batch,
    remainingDays:  duration,
    createdAt:      new Date().toISOString(),
    grantedByAdmin: true,
  });

  // Update user profile
  await db.collection("users").doc(userId).update({
    programId,
    programTitle,
    programStartDate: start,
    currentDay:       1,
  });

  return NextResponse.json({ success: true, enrollmentId: enrollmentRef.id });
}
