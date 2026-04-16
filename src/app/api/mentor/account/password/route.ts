import { NextRequest, NextResponse } from "next/server";
import { adminAuth, verifyFirebaseToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminAuth) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  let body: { newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const newPassword = body.newPassword?.trim() ?? "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  await adminAuth.updateUser(uid, { password: newPassword });
  return NextResponse.json({ success: true });
}
