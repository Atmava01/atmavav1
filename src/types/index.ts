export type UserRole = "user" | "mentor" | "admin";
export type ProgramId = "30" | "60" | "90";

export type PaymentStatus    = "created" | "paid" | "failed";
export type EnrollmentStatus = "active" | "expired";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photoURL: string | null;
  programId: ProgramId | null;
  programTitle: string | null;
  programStartDate: string | null;
  currentDay: number;
  createdAt: string;
  bio?: string;
  specialization?: string;
}

export interface Program {
  id: ProgramId;
  title: string;
  duration: number;
  description: string;
  /** Price in paise (INR × 100) */
  price: number;
  isActive: boolean;
  isFree: boolean;
  features: string[];
  enrolledCount: number;
  mentorId: string | null;
  mentorName: string | null;
  batches: { name: string; time: string }[];
  levels: string[];
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: "PDF" | "Audio" | "Video";
  url: string;
  programId: string;
  size: string;
  addedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  programId: string;
  /** Razorpay order ID — used to correlate create-order → verify */
  razorpayOrderId: string;
  /** Populated after successful payment */
  razorpayPaymentId?: string;
  /** Amount in paise (INR × 100) */
  amount: number;
  status: PaymentStatus;
  /** Which environment the payment was captured in */
  mode: "test" | "live";
  createdAt: string;
}

/** Unified enrollment — covers both payment-created and admin-granted access */
export interface Enrollment {
  id: string;
  userId: string;
  programId: string;
  /** Razorpay payment doc ID. null = admin-granted access */
  paymentId: string | null;
  status: EnrollmentStatus;
  /** ISO date string — when access begins */
  startDate: string;
  /** ISO date string — when access expires (startDate + durationDays) */
  endDate: string;
  createdAt: string;
  grantedByAdmin: boolean;
  /** User-selected level (e.g. "Beginner", "Intermediate", "Advanced") */
  level: string;
  /** User-selected batch (e.g. "Morning", "Evening") */
  batch: string;
  /** Remaining class days (decrements Mon–Sat only) */
  remainingDays: number;
}

/** A live session created by a mentor for a program */
export interface Session {
  id: string;
  programId: string;
  mentorId: string;
  mentorName: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  meetLink: string;
  /** Batch this session is for (e.g. "Morning", "Evening") */
  batch: string;
  createdAt: string;
}

/** Attendance record for a student in a session */
export interface Attendance {
  id: string;
  sessionId: string;
  programId: string;
  userId: string;
  userName: string;
  present: boolean;
  date: string;       // YYYY-MM-DD
  createdAt: string;
}
