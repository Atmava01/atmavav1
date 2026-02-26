/**
 * /api/attendance
 *
 * POST — Upsert an attendance record (mentor or admin only).
 *   Body: { sessionId, programId, userId, userName, present, date }
 *   Doc ID = {sessionId}_{userId}
 *
 * GET  — Fetch attendance records.
 *   Query: ?sessionId=xxx          → all attendance for a session
 *   Query: ?userId=xxx&programId=xxx → user's attendance history in a program
 *
 * Headers:
 *   Authorization: Bearer <Firebase ID token>
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  // Verify mentor or admin role
  const callerSnap = await db.collection("users").doc(uid).get();
  const role = callerSnap.data()?.role;
  if (role !== "mentor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden — mentor or admin role required." }, { status: 403 });
  }

  let body: {
    sessionId?:  string;
    programId?:  string;
    userId?:     string;
    userName?:   string;
    present?:    boolean;
    date?:       string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { sessionId, programId, userId: targetUserId, userName = "", present = false, date } = body;

  if (!sessionId || !programId || !targetUserId || !date) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, programId, userId, date." },
      { status: 400 }
    );
  }

  const docId = `${sessionId}_${targetUserId}`;

  await db.collection("attendance").doc(docId).set({
    id:        docId,
    sessionId,
    programId,
    userId:    targetUserId,
    userName,
    present,
    date,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }, { merge: true });

  return NextResponse.json({ success: true, id: docId });
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  const { searchParams } = new URL(req.url);
  const sessionId  = searchParams.get("sessionId");
  const userId     = searchParams.get("userId");
  const programId  = searchParams.get("programId");

  if (sessionId) {
    // Fetch all attendance records for a session (mentor viewing their session)
    const snap = await db.collection("attendance")
      .where("sessionId", "==", sessionId)
      .get();

    const records = snap.docs.map(d => d.data());
    return NextResponse.json({ attendance: records });
  }

  if (userId && programId) {
    // Fetch attendance history for a specific user in a program
    const snap = await db.collection("attendance")
      .where("userId",    "==", userId)
      .where("programId", "==", programId)
      .orderBy("date", "desc")
      .limit(50)
      .get();

    const records = snap.docs.map(d => d.data());
    return NextResponse.json({ attendance: records });
  }

  return NextResponse.json(
    { error: "Provide either sessionId or userId+programId query params." },
    { status: 400 }
  );
}
