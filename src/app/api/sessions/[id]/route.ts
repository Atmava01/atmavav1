/**
 * PUT /api/sessions/[id]   — edit a session
 * DELETE /api/sessions/[id] — delete a session
 *
 * Both require Authorization: Bearer <Firebase ID token>
 * Only the session creator (mentorId) or an admin can modify/delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, adminDb } from "@/lib/firebaseAdmin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  const { id } = await params;

  const sessionRef = db.collection("sessions").doc(id);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const session = sessionSnap.data()!;

  // Verify ownership or admin
  const userSnap = await db.collection("users").doc(uid).get();
  const role = userSnap.data()?.role;
  if (session.mentorId !== uid && role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: {
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    meetLink?: string;
    programId?: string;
    batch?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  // Only update provided fields
  const updates: Record<string, string> = {};
  if (body.title !== undefined)     updates.title     = body.title;
  if (body.date !== undefined)      updates.date      = body.date;
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined)   updates.endTime   = body.endTime;
  if (body.meetLink !== undefined)  updates.meetLink  = body.meetLink;
  if (body.programId !== undefined) updates.programId = body.programId;
  if (body.batch !== undefined)     updates.batch     = body.batch;

  await sessionRef.update(updates);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  const db = adminDb;

  const { id } = await params;

  const sessionRef = db.collection("sessions").doc(id);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const session = sessionSnap.data()!;

  // Verify ownership or admin
  const userSnap = await db.collection("users").doc(uid).get();
  const role = userSnap.data()?.role;
  if (session.mentorId !== uid && role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await sessionRef.delete();

  return NextResponse.json({ success: true });
}
