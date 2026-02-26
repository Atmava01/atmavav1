import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot,
  startAfter, QueryDocumentSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  UserProfile, Program, Resource, Payment,
  Enrollment, Session, Attendance,
} from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function programTitle(id: string | null): string {
  const map: Record<string, string> = {
    "30": "30 Days — Foundation",
    "60": "60 Days — Deepening",
    "90": "90 Days — Inner Mastery",
  };
  return id ? (map[id] ?? id) : "";
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    uid,
    email: data.email ?? "",
    name: data.name ?? "",
    role: data.role ?? "user",
    photoURL: data.photoURL ?? null,
    programId: null,
    programTitle: null,
    programStartDate: null,
    currentDay: 1,
    createdAt: new Date().toISOString(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as DocumentData);
}

export function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function getAllUsers(pageSize = 20, lastDoc?: QueryDocumentSnapshot): Promise<UserProfile[]> {
  let q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(pageSize));
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getAllMentors(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), where("role", "==", "mentor"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function setUserRole(uid: string, role: UserProfile["role"]): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

// ─── Programs ────────────────────────────────────────────────────────────────

export async function getPrograms(): Promise<Program[]> {
  const snap = await getDocs(collection(db, "programs"));
  return snap.docs.map((d) => d.data() as Program);
}

export async function getProgramById(programId: string): Promise<Program | null> {
  const snap = await getDoc(doc(db, "programs", programId));
  if (!snap.exists()) return null;
  return snap.data() as Program;
}

export async function upsertProgram(program: Program): Promise<void> {
  await setDoc(doc(db, "programs", program.id), program);
}

export async function seedPrograms(): Promise<void> {
  const defaultPrograms: Program[] = [
    {
      id: "30",
      title: "Foundation",
      duration: 30,
      description: "Ground yourself in daily practice. Learn to observe the mind, establish stillness rituals, and build an unshakeable base.",
      price: 14900,
      isActive: true,
      isFree: false,
      features: ["Live daily sessions", "Mon–Sat attendance", "Mentor guidance", "Level-based practice"],
      enrolledCount: 0,
      mentorId: null,
      mentorName: null,
      batches: [
        { name: "Morning", time: "6:30 AM" },
        { name: "Evening", time: "6:00 PM" },
      ],
      levels: ["Beginner", "Intermediate", "Advanced"],
    },
    {
      id: "60",
      title: "Deepening",
      duration: 60,
      description: "Move beyond the surface. Dissolve conditioning, integrate shadow work, and cultivate a living relationship with awareness.",
      price: 27900,
      isActive: true,
      isFree: false,
      features: ["Live daily sessions", "Mon–Sat attendance", "Mentor guidance", "Level-based practice"],
      enrolledCount: 0,
      mentorId: null,
      mentorName: null,
      batches: [
        { name: "Morning", time: "6:30 AM" },
        { name: "Evening", time: "6:00 PM" },
      ],
      levels: ["Beginner", "Intermediate", "Advanced"],
    },
    {
      id: "90",
      title: "Inner Mastery",
      duration: 90,
      description: "The complete Atmava immersion. Three months of structured transformation across all layers.",
      price: 44900,
      isActive: true,
      isFree: false,
      features: ["Live daily sessions", "Mon–Sat attendance", "Mentor guidance", "Level-based practice"],
      enrolledCount: 0,
      mentorId: null,
      mentorName: null,
      batches: [
        { name: "Morning", time: "6:30 AM" },
        { name: "Evening", time: "6:00 PM" },
      ],
      levels: ["Beginner", "Intermediate", "Advanced"],
    },
  ];
  for (const p of defaultPrograms) {
    const snap = await getDoc(doc(db, "programs", p.id));
    if (!snap.exists()) await upsertProgram(p);
  }
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function getResources(programId?: string): Promise<Resource[]> {
  let q = query(collection(db, "resources"), orderBy("addedAt", "desc"));
  if (programId) q = query(q, where("programId", "==", programId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource));
}

export async function addResource(data: Omit<Resource, "id">): Promise<void> {
  await addDoc(collection(db, "resources"), { ...data, addedAt: new Date().toISOString() });
}

export async function deleteResource(id: string): Promise<void> {
  await deleteDoc(doc(db, "resources", id));
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

/** Returns the user's active enrollment, or null if none/expired.
 *  Filters endDate in JS (YYYY-MM-DD comparison) to avoid composite index requirement. */
export async function getActiveEnrollment(userId: string): Promise<Enrollment | null> {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "enrollments"),
    where("userId", "==", userId),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Enrollment))
    .find(e => e.endDate >= today);
  return active ?? null;
}

/** Returns the enrollment for a specific program (regardless of expiry). */
export async function getUserEnrollmentForProgram(
  userId: string,
  programId: string
): Promise<Enrollment | null> {
  const q = query(
    collection(db, "enrollments"),
    where("userId", "==", userId),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Enrollment;
}

/** Admin — fetches recent enrollments ordered by date. */
export async function getEnrollmentsAdmin(limitCount = 100): Promise<Enrollment[]> {
  const q = query(
    collection(db, "enrollments"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
}

/** Admin — deactivate (revoke) an enrollment. */
export async function deactivateEnrollment(enrollmentId: string): Promise<void> {
  await updateDoc(doc(db, "enrollments", enrollmentId), { status: "expired" });
}

/** Admin — extend an enrollment's end date and re-activate if expired. */
export async function extendEnrollment(enrollmentId: string, newEndDate: string): Promise<void> {
  await updateDoc(doc(db, "enrollments", enrollmentId), {
    endDate: newEndDate,
    status: "active",
  });
}

/** Create a new enrollment document. Used by payment verify route + admin panel. */
export async function createEnrollment(data: {
  userId: string;
  programId: string;
  paymentId: string | null;
  grantedByAdmin: boolean;
  durationDays: number;
  level: string;
  batch: string;
  remainingDays: number;
}): Promise<string> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endDateObj = new Date(now);
  endDateObj.setDate(endDateObj.getDate() + data.durationDays);
  const endDate = endDateObj.toISOString().split("T")[0];

  const ref = await addDoc(collection(db, "enrollments"), {
    userId: data.userId,
    programId: data.programId,
    paymentId: data.paymentId,
    status: "active",
    startDate,
    endDate,
    createdAt: now.toISOString(),
    grantedByAdmin: data.grantedByAdmin,
    level: data.level,
    batch: data.batch,
    remainingDays: data.remainingDays,
  });

  // Update user profile with program info
  await updateDoc(doc(db, "users", data.userId), {
    programId: data.programId,
    programTitle: programTitle(data.programId),
    programStartDate: startDate,
    currentDay: 1,
  });

  // Increment enrolled count on program
  const pgRef = doc(db, "programs", data.programId);
  const pgSnap = await getDoc(pgRef);
  if (pgSnap.exists()) {
    const curr = pgSnap.data().enrolledCount ?? 0;
    await updateDoc(pgRef, { enrolledCount: curr + 1 });
  }

  return ref.id;
}

// ─── Students (by program) ────────────────────────────────────────────────────

/** Returns all active-enrollment students for a program, with their user profiles. */
export async function getStudentsForProgram(
  programId: string
): Promise<{ enrollment: Enrollment; userProfile: UserProfile }[]> {
  const q = query(
    collection(db, "enrollments"),
    where("programId", "==", programId),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  const enrollments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));

  const results = await Promise.all(
    enrollments.map(async (enrollment) => {
      const userSnap = await getDoc(doc(db, "users", enrollment.userId));
      if (!userSnap.exists()) return null;
      return { enrollment, userProfile: userSnap.data() as UserProfile };
    })
  );

  return results
    .filter((r): r is { enrollment: Enrollment; userProfile: UserProfile } => r !== null)
    .sort((a, b) => (a.userProfile.name ?? "").localeCompare(b.userProfile.name ?? ""));
}

// ─── Payments ─────────────────────────────────────────────────────────────────

/** Admin — fetches recent payments ordered by date. */
export async function getPaymentsAdmin(limitCount = 100): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/** Returns upcoming sessions for a program (today onwards), sorted by date. */
export async function getUpcomingSessionsForProgram(programId: string): Promise<Session[]> {
  const today = todayStr();
  const q = query(
    collection(db, "sessions"),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);
}

/** Returns upcoming sessions for a program filtered by batch, sorted by date. */
export async function getUpcomingSessionsForBatch(programId: string, batch: string): Promise<Session[]> {
  const today = todayStr();
  const q = query(
    collection(db, "sessions"),
    where("programId", "==", programId),
    where("batch", "==", batch)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);
}

/** Returns all sessions for a program (past + upcoming), sorted by date. */
export async function getSessionsForProgram(programId: string): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Returns all sessions created by a mentor, sorted by date. */
export async function getSessionsByMentor(mentorId: string): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("mentorId", "==", mentorId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/** Create or update an attendance record. Doc ID = {sessionId}_{userId} */
export async function upsertAttendance(
  data: Omit<Attendance, "id" | "createdAt">
): Promise<void> {
  const id = `${data.sessionId}_${data.userId}`;
  await setDoc(doc(db, "attendance", id), {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

/** Get all attendance records for a session. */
export async function getAttendanceForSession(sessionId: string): Promise<Attendance[]> {
  const q = query(
    collection(db, "attendance"),
    where("sessionId", "==", sessionId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Attendance);
}

/** Get attendance history for a user in a program (most recent first). */
export async function getAttendanceForUser(
  userId: string,
  programId: string,
  limitCount = 20
): Promise<Attendance[]> {
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as Attendance)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitCount);
}

// ─── Admin Analytics ─────────────────────────────────────────────────────────

export async function getAdminStats() {
  const today = todayStr();
  const in7days = new Date();
  in7days.setDate(in7days.getDate() + 7);
  const in7str = in7days.toISOString().split("T")[0];

  const [usersSnap, activeEnrollSnap, programsSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "enrollments"), where("status", "==", "active"))),
    getDocs(collection(db, "programs")),
    getDocs(collection(db, "sessions")),
  ]);

  const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
  const upcomingSessions = allSessions.filter(s => s.date >= today && s.date <= in7str).length;

  return {
    totalUsers: usersSnap.size,
    activeEnrollments: activeEnrollSnap.size,
    totalPrograms: programsSnap.size,
    upcomingSessions,
  };
}
