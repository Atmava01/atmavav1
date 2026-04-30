/**
 * POST /api/sessions/create
 *
 * Creates a new group session (mentor or admin only).
 *
 * Headers:
 *   Authorization: Bearer <Firebase ID token>
 *   Content-Type: application/json
 *
 * Body:
 *   { programId, title, date, startTime, endTime, batch }
 *
 * Response:
 *   { success: true, sessionId: string, meetLink: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";
import { buildSessionMeetLink } from "@/lib/sessionLinks";

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  // Verify mentor or admin role
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const role = userSnap.data()?.role;
  if (role !== "mentor" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden — mentor or admin role required." }, { status: 403 });
  }

  let body: {
    programId?: string;
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    batch?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const { programId, title, date, startTime, endTime, batch = "" } = body;

  if (!programId || !title || !date || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields: programId, title, date, startTime, endTime." },
      { status: 400 }
    );
  }

  const mentorName: string = userSnap.data()?.name ?? "Mentor";

  const sessionRef = db.collection("sessions").doc();
  const meetLink = buildSessionMeetLink(sessionRef.id);

  await sessionRef.set({
    programId,
    mentorId: uid,
    mentorName,
    title,
    date,
    startTime,
    endTime,
    meetLink,
    batch,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, sessionId: sessionRef.id, meetLink });
}
