export type UserRole = "user" | "mentor" | "admin";
export type ProgramId = string;

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
  phone?: string;
  city?: string;
  specializations?: string[];
  yearsOfExperience?: string;
  certifications?: string;
  trainerStatus?: "approved" | "pending" | "inactive";
  mentorBankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: "Savings" | "Current";
    updatedAt?: string;
  };
  mentorNotificationSettings?: {
    newStudentEnrollments: boolean;
    sessionReminders30Min: boolean;
    payoutNotifications: boolean;
    platformAnnouncements: boolean;
    studentAtRiskAlerts: boolean;
  };
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
  badge?: "most-popular" | "best-value" | null;
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

/** Journal entry written by a student */
export interface JournalEntry {
  id: string;
  userId: string;
  userName: string;
  programId: string | null;
  title: string;
  content: string;
  mood: string | null;           // emoji e.g. "😌"
  feeling?: string | null;       // "Tired" | "Neutral" | "Good" | "Energised" | "Motivated"
  rating?: number | null;        // 1-5 star session rating
  visibility: "private" | "shared"; // shared = mentor can read
  date: string;                  // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
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

/** Autopayment setup stored per user */
export interface AutopaymentSetup {
  userId: string;
  enabled: boolean;
  method: "upi" | "card";
  /** UPI ID if method === "upi" */
  upiId?: string;
  /** Last 4 digits of card if method === "card" */
  last4?: string;
  /** ISO date string of next scheduled charge */
  nextChargeDate?: string;
  /** Amount in paise */
  nextChargeAmount?: number;
  updatedAt: string;
}

/** A note posted by a mentor/guide to their students */
export interface GuideNote {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorPhotoURL: string | null;
  programId: string;
  /** null = broadcast to all students; userId string = personal note */
  targetUserId: string | null;
  targetUserName: string | null;
  title: string;
  content: string;
  createdAt: string;
}
