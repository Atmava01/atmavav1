import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  getDocs, onSnapshot,
  startAfter, QueryDocumentSnapshot, DocumentData,
  arrayUnion, arrayRemove, increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  UserProfile, Program, Resource, Payment,
  Enrollment, Session, Attendance, JournalEntry, GuideNote,
  AutopaymentSetup,
} from "@/types";

type MentorAssignmentSnapshot = {
  program: Program | null;
  students: { enrollment: Enrollment; userProfile: UserProfile }[];
};

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

export async function getProgramByMentorId(mentorId: string): Promise<Program | null> {
  const q = query(
    collection(db, "programs"),
    where("mentorId", "==", mentorId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Program;
}

export async function getAssignedProgramForMentor(args: {
  mentorId: string;
  mentorName?: string | null;
}): Promise<Program | null> {
  const byId = await getProgramByMentorId(args.mentorId);
  if (byId) return byId;

  const mentorName = args.mentorName?.trim();
  if (!mentorName) return null;

  const byName = await getDocs(query(
    collection(db, "programs"),
    where("mentorName", "==", mentorName),
    limit(1)
  ));
  if (byName.empty) return null;
  return byName.docs[0].data() as Program;
}

export async function getMentorAssignmentSnapshot(idToken: string): Promise<MentorAssignmentSnapshot> {
  const res = await fetch("/api/mentor/assignment", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch mentor assignment.");
  }

  return res.json() as Promise<MentorAssignmentSnapshot>;
}

export async function upsertProgram(program: Program): Promise<void> {
  await setDoc(doc(db, "programs", program.id), program);
}

export async function deleteProgram(programId: string): Promise<void> {
  await deleteDoc(doc(db, "programs", programId));
}

export async function seedPrograms(): Promise<void> {
  const baseProgram: Program = {
    id: "30",
    title: "Foundation",
    duration: 30,
    description: "Ground yourself in daily practice. Live sessions Monday through Saturday with a dedicated mentor, available in morning and evening batches.",
    price: 99900, // ₹999 in paise
    isActive: true,
    isFree: false,
    features: ["Live daily sessions (Mon–Sat)", "Morning & Evening batches", "Dedicated mentor guidance", "Attendance tracking", "Beginner to Advanced levels"],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [
      { name: "Morning", time: "6:30 AM" },
      { name: "Evening", time: "6:00 PM" },
    ],
    levels: ["Beginner", "Intermediate", "Advanced"],
  };
  const snap = await getDoc(doc(db, "programs", baseProgram.id));
  if (!snap.exists()) await upsertProgram(baseProgram);
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
 *  Only filters by userId in Firestore (single-field index, always works).
 *  status and endDate are checked in JS to avoid composite index requirement. */
export async function getActiveEnrollment(userId: string): Promise<Enrollment | null> {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "enrollments"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const active = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Enrollment))
    .find(e => e.status === "active" && e.endDate >= today);
  return active ?? null;
}

/** Returns the enrollment for a specific program (regardless of expiry). */
export async function getUserEnrollmentForProgram(
  userId: string,
  programId: string
): Promise<Enrollment | null> {
  const q = query(
    collection(db, "enrollments"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const match = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Enrollment))
    .find(e => e.programId === programId);
  return match ?? null;
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

  const enrollmentRows = results
    .filter((r): r is { enrollment: Enrollment; userProfile: UserProfile } => r !== null);

  const existingUserIds = new Set(enrollmentRows.map((row) => row.userProfile.uid));

  // Fallback for users assigned directly to a program profile without a matching enrollment doc.
  const fallbackUsersSnap = await getDocs(query(
    collection(db, "users"),
    where("programId", "==", programId)
  ));

  const fallbackRows = fallbackUsersSnap.docs
    .map((docSnap) => docSnap.data() as UserProfile)
    .filter((profile) => !existingUserIds.has(profile.uid))
    .map((userProfile) => ({
      enrollment: {
        id: `profile-${userProfile.uid}`,
        userId: userProfile.uid,
        programId,
        paymentId: null,
        status: "active" as const,
        startDate: userProfile.programStartDate ?? todayStr(),
        endDate: "9999-12-31",
        createdAt: userProfile.createdAt ?? new Date().toISOString(),
        grantedByAdmin: false,
        level: "",
        batch: "",
        remainingDays: 0,
      },
      userProfile,
    }));

  return [...enrollmentRows, ...fallbackRows]
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

/** Mentor — fetches all paid payments for a specific program (client-side sort). */
export async function getPaymentsByProgram(programId: string): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    where("programId", "==", programId),
    where("status", "==", "paid")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Mentor — fetches shared journal entries with ratings for a program (client-side sort, no composite index). */
export async function getJournalsWithRatingForProgram(programId: string): Promise<JournalEntry[]> {
  const q = query(
    collection(db, "journals"),
    where("programId", "==", programId),
    where("visibility", "==", "shared")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as JournalEntry)
    .filter(j => (j.rating ?? 0) > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

/** Get attendance history for a user in a program (most recent first).
 *  Only queries by userId to avoid composite index requirement; programId filtered in JS. */
export async function getAttendanceForUser(
  userId: string,
  programId: string,
  limitCount = 20
): Promise<Attendance[]> {
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as Attendance)
    .filter(a => a.programId === programId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitCount);
}

// ─── Landing Page Content ────────────────────────────────────────────────────

export interface LandingTestimonial {
  id: string;
  quote: string;
  name: string;
  detail: string;
  initials: string;
}

export interface LandingMentor {
  id: string;
  name: string;
  paras: string[];
  photoURL?: string;
}

export async function getLandingTestimonials(): Promise<LandingTestimonial[]> {
  const snap = await getDocs(collection(db, "landingTestimonials"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LandingTestimonial));
}

export async function upsertLandingTestimonial(data: LandingTestimonial): Promise<void> {
  await setDoc(doc(db, "landingTestimonials", data.id), data);
}

export async function addLandingTestimonial(data: Omit<LandingTestimonial, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "landingTestimonials"), data);
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function deleteLandingTestimonial(id: string): Promise<void> {
  await deleteDoc(doc(db, "landingTestimonials", id));
}

export async function getLandingMentors(): Promise<LandingMentor[]> {
  const snap = await getDocs(collection(db, "landingMentors"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LandingMentor));
}

export async function upsertLandingMentor(data: LandingMentor): Promise<void> {
  await setDoc(doc(db, "landingMentors", data.id), data);
}

export async function addLandingMentor(data: Omit<LandingMentor, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "landingMentors"), data);
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function deleteLandingMentor(id: string): Promise<void> {
  await deleteDoc(doc(db, "landingMentors", id));
}

const DEFAULT_TESTIMONIALS: Omit<LandingTestimonial, "id">[] = [
  { quote: "The 60-day program completely transformed how I relate to my mind. For the first time, I can sit in stillness without running from myself.", name: "Priya S.", detail: "60-Day Program · Morning Batch", initials: "PS" },
  { quote: "I came in skeptical. I left with a practice that has stayed with me every single day. The live sessions with the mentor made all the difference.", name: "Arjun M.", detail: "90-Day Program · Evening Batch", initials: "AM" },
  { quote: "Atmava gave me tools I didn't know I needed. My anxiety has reduced, my focus is sharper, and I feel genuinely at peace with who I am.", name: "Sneha R.", detail: "60-Day Program · Morning Batch", initials: "SR" },
];

const DEFAULT_MENTORS: Omit<LandingMentor, "id">[] = [
  {
    name: "Jagadish",
    paras: [
      "Jagadish is a dedicated trainer at Ātmava, guiding individuals through the deeper dialogue between Soma and Manas, the body's innate intelligence and the mind's quiet clarity. With a grounded, experiential approach, he helps participants reconnect with their physical sensations, emotional patterns, and mental stillness, creating space for realignment and inner balance.",
      "His sessions blend mindful movement, breathwork, and contemplative practices, encouraging people to listen to the body as a teacher while cultivating a calmer, steadier mind. Jagadish's focus is not on performance or perfection, but on presence — helping each person discover a more harmonious relationship between what the body feels and what the mind experiences.",
      "Through his work at Ātmava, he supports individuals on a journey of self-awareness, healing, and integration, making the principles of Soma and Manas accessible in everyday living.",
    ],
  },
  {
    name: "Leeza Chandy",
    paras: [
      "Leeza brings a warm, intuitive presence to Ātmava, offering a practice that gently bridges movement, awareness, and emotional grounding. Her work is centred on helping individuals reconnect with themselves through subtle bodywork, conscious breath, and mindful pauses that create space for reflection and release.",
      "With a natural ability to sense the needs of a group, Leeza designs sessions that are supportive, fluid, and deeply personal. She encourages participants to slow down, notice their inner rhythms, and build a more compassionate connection with their physical and emotional wellbeing.",
      "Leeza's approach blends sensitivity with clarity — making her sessions both calming and transformative. Through her guidance, individuals learn to tune into themselves with honesty, softness, and renewed presence.",
    ],
  },
];

export async function seedLandingDefaults(): Promise<void> {
  const [tSnap, mSnap] = await Promise.all([
    getDocs(collection(db, "landingTestimonials")),
    getDocs(collection(db, "landingMentors")),
  ]);

  const tasks: Promise<unknown>[] = [];

  if (tSnap.empty) {
    for (const t of DEFAULT_TESTIMONIALS) {
      tasks.push(
        addDoc(collection(db, "landingTestimonials"), t).then(ref =>
          updateDoc(ref, { id: ref.id })
        )
      );
    }
  }

  if (mSnap.empty) {
    for (const m of DEFAULT_MENTORS) {
      tasks.push(
        addDoc(collection(db, "landingMentors"), m).then(ref =>
          updateDoc(ref, { id: ref.id })
        )
      );
    }
  }

  if (tasks.length > 0) await Promise.all(tasks);
}

// ─── Admin Analytics ─────────────────────────────────────────────────────────

// ─── Mood Logs ───────────────────────────────────────────────────────────────

export interface MoodLog {
  id: string;
  userId: string;
  date: string;   // YYYY-MM-DD
  mood: string;   // "Tired" | "Neutral" | "Good" | "Energised" | "Motivated"
  createdAt: string;
}

export async function saveMoodLog(userId: string, mood: string): Promise<void> {
  const date = todayStr();
  const id = `${userId}_${date}`;
  await setDoc(doc(db, "moodLogs", id), { id, userId, date, mood, createdAt: new Date().toISOString() });
}

export async function getTodayMoodLog(userId: string): Promise<MoodLog | null> {
  const snap = await getDoc(doc(db, "moodLogs", `${userId}_${todayStr()}`));
  return snap.exists() ? (snap.data() as MoodLog) : null;
}

export async function getRecentMoodLogs(userId: string, limitCount = 60): Promise<MoodLog[]> {
  const q = query(collection(db, "moodLogs"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as MoodLog)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limitCount);
}


// ─── Payment by ID ────────────────────────────────────────────────────────────

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const snap = await getDoc(doc(db, "payments", paymentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Payment;
}

// ─── Today's sessions ────────────────────────────────────────────────────────

export async function getTodaySessionsForProgram(programId: string): Promise<Session[]> {
  const today = todayStr();
  const q = query(
    collection(db, "sessions"),
    where("programId", "==", programId),
    where("date", "==", today)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function subscribeTodaySessionsForProgram(
  programId: string,
  callback: (sessions: Session[]) => void
): () => void {
  const today = todayStr();
  const q = query(
    collection(db, "sessions"),
    where("programId", "==", programId),
    where("date", "==", today)
  );
  return onSnapshot(q, snap => {
    const sessions = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Session))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    callback(sessions);
  });
}

// ─── Community activity ───────────────────────────────────────────────────────

export async function getProgramActivity(
  programId: string,
  excludeUserId: string,
  limitCount = 6
): Promise<Attendance[]> {
  const q = query(collection(db, "attendance"), where("programId", "==", programId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as Attendance)
    .filter(a => a.userId !== excludeUserId && a.present)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limitCount);
}


export interface LeaderboardEntry {
  userId: string;
  userName: string;
  count: number;
}

// ─── Session Mic Requests ────────────────────────────────────────────────────

export interface MicRequest {
  id: string;        // userId as document id
  userId: string;
  userName: string;
  status: "pending" | "approved" | "denied";
  requestedAt: string;
}

export async function requestMicPermission(
  sessionId: string,
  userId: string,
  userName: string
): Promise<void> {
  await setDoc(doc(db, "sessionMicRequests", sessionId, "requests", userId), {
    userId,
    userName,
    status: "pending",
    requestedAt: new Date().toISOString(),
  });
}

export async function respondToMicRequest(
  sessionId: string,
  userId: string,
  approved: boolean
): Promise<void> {
  await updateDoc(doc(db, "sessionMicRequests", sessionId, "requests", userId), {
    status: approved ? "approved" : "denied",
  });
}

export function subscribeMicRequests(
  sessionId: string,
  callback: (requests: MicRequest[]) => void
): () => void {
  return onSnapshot(
    collection(db, "sessionMicRequests", sessionId, "requests"),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MicRequest)))
  );
}

export function subscribeMicStatus(
  sessionId: string,
  userId: string,
  callback: (status: MicRequest["status"] | null) => void
): () => void {
  return onSnapshot(
    doc(db, "sessionMicRequests", sessionId, "requests", userId),
    (snap) => callback(snap.exists() ? (snap.data() as MicRequest).status : null)
  );
}

// ─── Session by ID ────────────────────────────────────────────────────────────

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(db, "sessions", sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Session;
}

// ─── Session Chat ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export async function sendChatMessage(
  sessionId: string,
  userId: string,
  userName: string,
  message: string
): Promise<void> {
  await addDoc(collection(db, "sessionChats", sessionId, "messages"), {
    userId,
    userName,
    message,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToChatMessages(
  sessionId: string,
  callback: (msgs: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, "sessionChats", sessionId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

export async function getProgramLeaderboard(programId: string): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, "attendance"),
    where("programId", "==", programId),
    where("present", "==", true)
  );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => d.data() as Attendance);

  const byUser = new Map<string, { userName: string; count: number }>();
  for (const r of records) {
    const existing = byUser.get(r.userId);
    if (existing) existing.count++;
    else byUser.set(r.userId, { userName: r.userName, count: 1 });
  }

  return Array.from(byUser.entries())
    .map(([userId, { userName, count }]) => ({ userId, userName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

// ─── Session Presence ────────────────────────────────────────────────────────

export interface Presence {
  userId: string;
  userName: string;
  joinedAt: string;
  active: boolean;
  leftAt?: string;
}

export async function joinSessionPresence(sessionId: string, userId: string, userName: string): Promise<void> {
  await setDoc(doc(db, "sessions", sessionId, "presence", userId), {
    userId, userName,
    joinedAt: new Date().toISOString(),
    active: true,
  });
}

export async function leaveSessionPresence(sessionId: string, userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "sessions", sessionId, "presence", userId), {
      active: false,
      leftAt: new Date().toISOString(),
    });
  } catch {}
}

export function subscribeSessionPresence(
  sessionId: string,
  cb: (p: Presence[]) => void
): () => void {
  return onSnapshot(
    collection(db, "sessions", sessionId, "presence"),
    snap => cb(snap.docs.map(d => d.data() as Presence))
  );
}

// ─── Mentor Stats ─────────────────────────────────────────────────────────────

export async function getMentorSessionStats(mentorId: string): Promise<{
  totalSessions: number;
  thisMonthSessions: number;
  totalPresent: number;
  totalPossible: number;
}> {
  const sessionsSnap = await getDocs(
    query(collection(db, "sessions"), where("mentorId", "==", mentorId))
  );
  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonthSessions = sessions.filter(s => s.date >= monthStart).length;

  if (sessions.length === 0) {
    return { totalSessions: sessions.length, thisMonthSessions, totalPresent: 0, totalPossible: 0 };
  }

  const sessionIds = sessions.map(s => s.id);
  // Firestore `in` supports max 30 items; chunk if needed
  let allAttendance: Attendance[] = [];
  for (let i = 0; i < sessionIds.length; i += 30) {
    const chunk = sessionIds.slice(i, i + 30);
    const aSnap = await getDocs(
      query(collection(db, "attendance"), where("sessionId", "in", chunk))
    );
    allAttendance = allAttendance.concat(aSnap.docs.map(d => d.data() as Attendance));
  }

  return {
    totalSessions: sessions.length,
    thisMonthSessions,
    totalPresent: allAttendance.filter(a => a.present).length,
    totalPossible: allAttendance.length,
  };
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export async function createJournalEntry(
  data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "journals"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function updateJournalEntry(
  id: string,
  data: Partial<Pick<JournalEntry, "title" | "content" | "mood" | "feeling" | "rating" | "visibility">>
): Promise<void> {
  await updateDoc(doc(db, "journals", id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, "journals", id));
}

/** Get all journal entries for a user, newest first */
export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  const q = query(
    collection(db, "journals"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as JournalEntry);
}

/** Subscribe to a user's journal entries in real-time */
export function subscribeJournalEntries(
  userId: string,
  cb: (entries: JournalEntry[]) => void
): () => void {
  // Only filter by userId; sort client-side to avoid composite index requirement
  const q = query(
    collection(db, "journals"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, snap => {
    const sorted = snap.docs
      .map(d => d.data() as JournalEntry)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(sorted);
  });
}

/** Get shared journal entries for students in a program (mentor use) */
export async function getSharedJournalsForProgram(programId: string): Promise<JournalEntry[]> {
  const q = query(
    collection(db, "journals"),
    where("programId", "==", programId),
    where("visibility", "==", "shared"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as JournalEntry);
}

/** Subscribe to shared journals for a program (mentor use) */
export function subscribeSharedJournals(
  programId: string,
  cb: (entries: JournalEntry[]) => void
): () => void {
  const q = query(
    collection(db, "journals"),
    where("programId", "==", programId),
    where("visibility", "==", "shared"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as JournalEntry)));
}

/**
 * Subscribe to shared journals by a list of student userIds (mentor use).
 * Firestore `in` supports up to 30 values; we chunk if needed.
 */
export function subscribeSharedJournalsByUsers(
  userIds: string[],
  cb: (entries: JournalEntry[]) => void
): () => void {
  if (userIds.length === 0) { cb([]); return () => {}; }

  // Chunk into groups of 30 (Firestore `in` limit)
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 30) chunks.push(userIds.slice(i, i + 30));

  const allEntries: Map<string, JournalEntry[]> = new Map();
  const unsubs: (() => void)[] = [];

  const emit = () => {
    const merged = Array.from(allEntries.values())
      .flat()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(merged);
  };

  chunks.forEach((chunk, idx) => {
    allEntries.set(String(idx), []);
    const q = query(
      collection(db, "journals"),
      where("userId", "in", chunk),
      where("visibility", "==", "shared"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      allEntries.set(String(idx), snap.docs.map(d => d.data() as JournalEntry));
      emit();
    });
    unsubs.push(unsub);
  });

  return () => unsubs.forEach(u => u());
}

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

// ─── Admin Overview (full dashboard data) ────────────────────────────────────

export interface AdminOverviewData {
  totalUsers: number;
  totalPrograms: number;
  activeEnrollments: number;
  totalSessions: number;
  todaySessions: Session[];
  allSessions: Session[];
  programs: Program[];
  recentEnrollments: (Enrollment & { userName?: string; programTitle?: string })[];
  mentors: UserProfile[];
  payments: Payment[];
  attendanceCounts: Record<string, number>; // sessionId → present count
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  revenueByMonth: Record<string, number>;   // "YYYY-MM" → amount in paise
}

export async function getAdminOverviewData(): Promise<AdminOverviewData> {
  const today = todayStr();
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
  const weekAgoStr = weekAgo.toISOString();
  const monthAgoStr = monthAgo.toISOString();

  const [
    usersSnap, programsSnap, enrollSnap, sessionsSnap, mentorsSnap, paymentsSnap, attendanceSnap,
  ] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "programs")),
    getDocs(query(collection(db, "enrollments"), orderBy("createdAt", "desc"), limit(50))),
    getDocs(collection(db, "sessions")),
    getDocs(query(collection(db, "users"), where("role", "==", "mentor"))),
    getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(200))),
    getDocs(query(collection(db, "attendance"), where("present", "==", true))),
  ]);

  const allUsers    = usersSnap.docs.map(d => d.data() as UserProfile);
  const programs    = programsSnap.docs.map(d => d.data() as Program);
  const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
  const mentors     = mentorsSnap.docs.map(d => d.data() as UserProfile);
  const payments    = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

  // User name lookup
  const userMap = new Map<string, string>();
  allUsers.forEach(u => userMap.set(u.uid, u.name));

  // Program title lookup
  const programMap = new Map<string, string>();
  programs.forEach(p => programMap.set(p.id, p.title));

  // Active enrollments count
  const activeEnrollments = enrollSnap.docs.filter(d => d.data().status === "active").length;

  // Recent enrollments with names
  const recentEnrollments = enrollSnap.docs.map(d => {
    const e = { id: d.id, ...d.data() } as Enrollment;
    return {
      ...e,
      userName: userMap.get(e.userId) ?? "Unknown",
      programTitle: programMap.get(e.programId) ?? e.programId,
    };
  });

  // Today's sessions
  const todaySessions = allSessions.filter(s => s.date === today);

  // New users counts
  const newUsersThisWeek  = allUsers.filter(u => u.createdAt >= weekAgoStr).length;
  const newUsersThisMonth = allUsers.filter(u => u.createdAt >= monthAgoStr).length;

  // Attendance counts per session
  const attendanceCounts: Record<string, number> = {};
  attendanceSnap.docs.forEach(d => {
    const sid = d.data().sessionId as string;
    attendanceCounts[sid] = (attendanceCounts[sid] ?? 0) + 1;
  });

  // Revenue by month from paid payments
  const revenueByMonth: Record<string, number> = {};
  payments
    .filter(p => p.status === "paid")
    .forEach(p => {
      const month = p.createdAt.slice(0, 7); // "YYYY-MM"
      revenueByMonth[month] = (revenueByMonth[month] ?? 0) + (p.amount ?? 0);
    });

  return {
    totalUsers: allUsers.length,
    totalPrograms: programs.length,
    activeEnrollments,
    totalSessions: allSessions.length,
    todaySessions,
    allSessions,
    programs,
    recentEnrollments,
    mentors,
    payments,
    attendanceCounts,
    newUsersThisWeek,
    newUsersThisMonth,
    revenueByMonth,
  };
}

// ─── Circle (mini social) ─────────────────────────────────────────────────────

export interface CirclePost {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  photoURL?: string | null;
  content: string;
  mood?: string | null;
  category?: string | null;      // "Milestone" | "Insight" | "Question" | "Motivation"
  programId?: string | null;
  programTitle?: string | null;
  likedBy: string[];             // ❤️ heart reactions
  namasteBy?: string[];          // 🙏 namaste reactions (optional for backward compat)
  fireBy?: string[];             // 🔥 fire reactions (optional for backward compat)
  commentCount: number;
  createdAt: string;
}

export interface CircleComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userInitials: string;
  content: string;
  createdAt: string;
}

export interface CircleFollow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

/** Create a new post in the circle */
export async function createCirclePost(data: Omit<CirclePost, "id" | "likedBy" | "namasteBy" | "fireBy" | "commentCount">): Promise<string> {
  const ref = await addDoc(collection(db, "circlePosts"), {
    ...data,
    likedBy: [],
    namasteBy: [],
    fireBy: [],
    commentCount: 0,
  });
  return ref.id;
}

/** Toggle 🙏 namaste reaction on a post */
export async function toggleNamasteReaction(postId: string, userId: string, reacted: boolean): Promise<void> {
  await updateDoc(doc(db, "circlePosts", postId), {
    namasteBy: reacted ? arrayRemove(userId) : arrayUnion(userId),
  });
}

/** Toggle 🔥 fire reaction on a post */
export async function toggleFireReaction(postId: string, userId: string, reacted: boolean): Promise<void> {
  await updateDoc(doc(db, "circlePosts", postId), {
    fireBy: reacted ? arrayRemove(userId) : arrayUnion(userId),
  });
}

/** Delete a post (only owner) */
export async function deleteCirclePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "circlePosts", postId));
}

/** Toggle like on a post */
export async function toggleCircleLike(postId: string, userId: string, liked: boolean): Promise<void> {
  await updateDoc(doc(db, "circlePosts", postId), {
    likedBy: liked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

/** Subscribe to circle feed (all posts, most recent first) */
export function subscribeCircleFeed(
  cb: (posts: CirclePost[]) => void,
  limitCount = 30
): () => void {
  const q = query(
    collection(db, "circlePosts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CirclePost)));
  });
}

/** Add a comment to a post */
export async function addCircleComment(data: Omit<CircleComment, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "circleComments"), data);
  await updateDoc(doc(db, "circlePosts", data.postId), { commentCount: increment(1) });
  return ref.id;
}

/** Subscribe to comments for a post */
export function subscribeCircleComments(
  postId: string,
  cb: (comments: CircleComment[]) => void
): () => void {
  // Note: using only `where` (no `orderBy`) avoids needing a composite index.
  // We sort chronologically on the client using the ISO createdAt string.
  const q = query(
    collection(db, "circleComments"),
    where("postId", "==", postId)
  );
  return onSnapshot(q, snap => {
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as CircleComment))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    cb(sorted);
  });
}

/** Follow a user */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  const id = `${followerId}_${followingId}`;
  await setDoc(doc(db, "circleFollows", id), {
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  });
}

/** Unfollow a user */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await deleteDoc(doc(db, "circleFollows", `${followerId}_${followingId}`));
}

/** Get IDs of users that a user follows */
export async function getFollowing(userId: string): Promise<string[]> {
  const q = query(collection(db, "circleFollows"), where("followerId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().followingId as string);
}

/** Get follower count for a user */
export async function getFollowerCount(userId: string): Promise<number> {
  const q = query(collection(db, "circleFollows"), where("followingId", "==", userId));
  const snap = await getDocs(q);
  return snap.size;
}

/** Get all members (users with role=user) for the People tab */
export async function getCircleMembers(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), where("role", "==", "user"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}

// ─── Guide Notes ───────────────────────────────────────────────────────────────

/** Post a note from a mentor/guide */
export async function createGuideNote(
  data: Omit<GuideNote, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "guideNotes"), data);
  return ref.id;
}

/** Delete a guide note (mentor author only) */
export async function deleteGuideNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, "guideNotes", noteId));
}

/**
 * Subscribe to guide notes visible to a student.
 * Fetches all notes for the program and filters client-side
 * (broadcast + personal) to avoid composite index requirements.
 */
export function subscribeGuideNotesForUser(
  userId: string,
  programId: string,
  cb: (notes: GuideNote[]) => void
): () => void {
  const q = query(
    collection(db, "guideNotes"),
    where("programId", "==", programId)
  );
  return onSnapshot(q,
    snap => {
      const notes = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as GuideNote))
        .filter(n => n.targetUserId === null || n.targetUserId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      cb(notes);
    },
    () => { /* rules not yet deployed — fail silently */ }
  );
}

/** Subscribe to all notes posted by a mentor */
export function subscribeGuideNotesByMentor(
  mentorId: string,
  cb: (notes: GuideNote[]) => void
): () => void {
  const q = query(
    collection(db, "guideNotes"),
    where("mentorId", "==", mentorId)
  );
  return onSnapshot(q, snap => {
    const notes = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as GuideNote))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    cb(notes);
  });
}

// ─── User Payment History ─────────────────────────────────────────────────────

/** Returns all payments for a user, most recent first. */
export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  // No orderBy — sort client-side to avoid composite index requirement
  const q = query(
    collection(db, "payments"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Autopayment Setup ────────────────────────────────────────────────────────

/** Fetch the autopayment setup for a user. Returns null if not configured. */
export async function getAutopaymentSetup(userId: string): Promise<AutopaymentSetup | null> {
  const snap = await getDoc(doc(db, "autopaymentSetup", userId));
  if (!snap.exists()) return null;
  return snap.data() as AutopaymentSetup;
}

/** Create or update the autopayment setup for a user. */
export async function setAutopaymentSetup(
  userId: string,
  data: Omit<AutopaymentSetup, "userId" | "updatedAt">
): Promise<void> {
  await setDoc(doc(db, "autopaymentSetup", userId), {
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/** Disable autopayment for a user (sets enabled: false). */
export async function disableAutopayment(userId: string): Promise<void> {
  await setDoc(doc(db, "autopaymentSetup", userId), {
    enabled: false,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
