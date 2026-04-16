import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyFirebaseToken } from "@/lib/firebaseAdmin";
import type { Enrollment, Program, UserProfile } from "@/types";

type StudentRow = { enrollment: Enrollment; userProfile: UserProfile };

async function getAssignedProgramForMentor(db: FirebaseFirestore.Firestore, mentor: UserProfile): Promise<Program | null> {
  const byId = await db
    .collection("programs")
    .where("mentorId", "==", mentor.uid)
    .limit(1)
    .get();

  if (!byId.empty) {
    return { id: byId.docs[0].id, ...byId.docs[0].data() } as Program;
  }

  const mentorName = mentor.name?.trim();
  if (!mentorName) return null;

  const byName = await db
    .collection("programs")
    .where("mentorName", "==", mentorName)
    .limit(1)
    .get();

  if (byName.empty) return null;
  return { id: byName.docs[0].id, ...byName.docs[0].data() } as Program;
}

async function getStudentsForProgram(db: FirebaseFirestore.Firestore, programId: string): Promise<StudentRow[]> {
  const enrollmentsSnap = await db
    .collection("enrollments")
    .where("programId", "==", programId)
    .where("status", "==", "active")
    .get();

  const enrollmentRows: StudentRow[] = [];
  for (const enrollmentDoc of enrollmentsSnap.docs) {
    const enrollment = { id: enrollmentDoc.id, ...enrollmentDoc.data() } as Enrollment;
    const userSnap = await db.collection("users").doc(enrollment.userId).get();
    if (!userSnap.exists) continue;
    enrollmentRows.push({
      enrollment,
      userProfile: userSnap.data() as UserProfile,
    });
  }

  const existingUserIds = new Set(enrollmentRows.map((row) => row.userProfile.uid));

  const usersSnap = await db
    .collection("users")
    .where("programId", "==", programId)
    .get();

  for (const userDoc of usersSnap.docs) {
    const userProfile = userDoc.data() as UserProfile;
    if (existingUserIds.has(userProfile.uid) || userProfile.role !== "user") continue;

    enrollmentRows.push({
      enrollment: {
        id: `profile-${userProfile.uid}`,
        userId: userProfile.uid,
        programId,
        paymentId: null,
        status: "active",
        startDate: userProfile.programStartDate ?? new Date().toISOString().split("T")[0],
        endDate: "9999-12-31",
        createdAt: userProfile.createdAt ?? new Date().toISOString(),
        grantedByAdmin: false,
        level: "",
        batch: "",
        remainingDays: 0,
      },
      userProfile,
    });
  }

  return enrollmentRows.sort((a, b) => (a.userProfile.name ?? "").localeCompare(b.userProfile.name ?? ""));
}

export async function GET(req: NextRequest) {
  const uid = await verifyFirebaseToken(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminDb) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  const mentorSnap = await adminDb.collection("users").doc(uid).get();
  if (!mentorSnap.exists) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const mentor = { uid, ...mentorSnap.data() } as UserProfile;
  if (mentor.role !== "mentor" && mentor.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const program = await getAssignedProgramForMentor(adminDb, mentor);
  if (!program) {
    return NextResponse.json({ program: null, students: [] });
  }

  const students = await getStudentsForProgram(adminDb, program.id);
  return NextResponse.json({ program, students });
}
