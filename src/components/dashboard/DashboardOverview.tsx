"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Flame, Target, TrendingUp, BarChart2, ChevronRight, Bell, Calendar,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveEnrollment, getSessionsForProgram, getAttendanceForUser,
  getProgramById, getTodayMoodLog, saveMoodLog, getRecentMoodLogs,
  getTodaySessionsForProgram,
} from "@/lib/firestore";
import { getPrograms } from "@/lib/firestore";
import { PaymentModal } from "@/components/PaymentModal";
import type { Enrollment, Program, Session, Attendance } from "@/types";
import type { MoodLog } from "@/lib/firestore";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  daysAttended: number;
  thisWeekCount: number;
  currentStreak: number;
  personalBest: number;
  sessionsThisMonth: number;
  possibleThisMonth: number;
  completionRate: number;
  prevMonthRate: number;
  currentDay: number;
}

interface WeekDay {
  letter: string;
  date: string;
  attended: boolean;
  isToday: boolean;
  isPast: boolean;
  isClassDay: boolean;
}

interface DashboardData {
  enrollment: Enrollment;
  program: Program | null;
  todaySessions: Session[];
  upcomingSessions: Session[];
  attendance: Attendance[];
  moodByDate: Map<string, string>;
  todayMood: string | null;
  stats: Stats;
  weekDays: WeekDay[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split("T")[0]; }

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

function fmtDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
}

function isSessionLive(s: Session): boolean {
  const today = new Date();
  if (s.date !== todayStr()) return false;
  const now = today.getHours() * 60 + today.getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  const [eh, em] = s.endTime.split(":").map(Number);
  return now >= sh * 60 + sm && now <= eh * 60 + em;
}

function minsLeft(s: Session) {
  const [eh, em] = s.endTime.split(":").map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return Math.max(0, (eh * 60 + em) - now);
}

function minsUntil(s: Session) {
  const [sh, sm] = s.startTime.split(":").map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return (sh * 60 + sm) - now;
}

function fmtRelative(mins: number) {
  if (mins < 60) return `In ${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `In ${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcCurrentStreak(presentDates: Set<string>): number {
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 200; i++) {
    const d = cur.toISOString().split("T")[0];
    const dow = cur.getDay();
    if (dow === 0) { cur.setDate(cur.getDate() - 1); continue; }
    if (d === todayStr() && !presentDates.has(d)) { cur.setDate(cur.getDate() - 1); continue; }
    if (presentDates.has(d)) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function calcPersonalBest(presentDates: Set<string>): number {
  const sorted = Array.from(presentDates).sort();
  if (!sorted.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const next = new Date(sorted[i] + "T00:00:00");
    const diff = Math.round((next.getTime() - prev.getTime()) / 86400000);
    if (diff === 1 || (diff === 2 && prev.getDay() === 6)) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

function countMonSatDays(startStr: string, endStr: string): number {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) { if (cur.getDay() !== 0) count++; cur.setDate(cur.getDate() + 1); }
  return count;
}

function buildWeekDays(presentDates: Set<string>): WeekDay[] {
  const monday = getMondayOfWeek(new Date());
  const today = todayStr();
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const date = d.toISOString().split("T")[0];
    return {
      letter: letters[i],
      date,
      attended: presentDates.has(date),
      isToday: date === today,
      isPast: date < today,
      isClassDay: d.getDay() !== 0,
    };
  });
}

function calcStats(attendance: Attendance[], enrollment: Enrollment, program: Program | null): Stats {
  const presentDates = new Set(attendance.filter(a => a.present).map(a => a.date));
  const today = todayStr();
  const monday = getMondayOfWeek(new Date());

  let thisWeekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (presentDates.has(d.toISOString().split("T")[0])) thisWeekCount++;
  }

  const monthPrefix = today.slice(0, 7);
  const prevDate = new Date(today.slice(0, 4) + "-" + today.slice(5, 7) + "-01T00:00:00");
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevPrefix = prevDate.toISOString().slice(0, 7);
  const prevEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().split("T")[0];

  const sessionsThisMonth = Array.from(presentDates).filter(d => d.startsWith(monthPrefix)).length;
  const possibleThisMonth = countMonSatDays(monthPrefix + "-01", today);
  const prevSessions = Array.from(presentDates).filter(d => d.startsWith(prevPrefix)).length;
  const prevPossible = countMonSatDays(prevPrefix + "-01", prevEnd);

  const duration = program?.duration ?? Number(enrollment.programId) ?? 30;
  const currentDay = Math.max(1, duration - enrollment.remainingDays + 1);

  return {
    daysAttended: presentDates.size,
    thisWeekCount,
    currentStreak: calcCurrentStreak(presentDates),
    personalBest: calcPersonalBest(presentDates),
    sessionsThisMonth,
    possibleThisMonth,
    completionRate: possibleThisMonth > 0 ? Math.round((sessionsThisMonth / possibleThisMonth) * 100) : 0,
    prevMonthRate: prevPossible > 0 ? Math.round((prevSessions / prevPossible) * 100) : 0,
    currentDay,
  };
}

function generateReferralCode(name: string, uid: string): string {
  return (name.split(" ")[0].toUpperCase() + uid.slice(-4).toUpperCase()).slice(0, 10);
}

// ─── Achievements ──────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: "first-step",   icon: "🌟", label: "First Step",     lockedLabel: "1ST SESSION", check: (s: Stats) => s.daysAttended >= 1 },
  { id: "seven-day",    icon: "🔥", label: "7-Day Warrior",  lockedLabel: "7-STREAK",    check: (s: Stats) => s.personalBest >= 7 },
  { id: "night-owl",    icon: "🌙", label: "Night Owl",      lockedLabel: "EVE SESSION",  check: (s: Stats) => s.daysAttended >= 1 },
  { id: "thirty-day",   icon: "🏆", label: "30-Day Devotee", lockedLabel: "30 SESSIONS",  check: (s: Stats) => s.daysAttended >= 30 },
  { id: "iron-will",    icon: "💎", label: "Iron Will",      lockedLabel: "18-STREAK",    check: (s: Stats) => s.personalBest >= 18 },
  { id: "inner-master", icon: "👑", label: "Inner Master",   lockedLabel: "FINISH PROG",  check: (s: Stats, e: Enrollment) => e.remainingDays <= 0 },
];

// ─── Mood options ──────────────────────────────────────────────────────────────

const MOODS = [
  { label: "Tired",     emoji: "😴" },
  { label: "Neutral",   emoji: "😐" },
  { label: "Good",      emoji: "🙂" },
  { label: "Energised", emoji: "✨" },
  { label: "Motivated", emoji: "🔥" },
];

// ─── Main component ────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [modal, setModal]       = useState<Program | null>(null);

  const firstName = userProfile?.name?.split(" ")[0] ?? "Yogi";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const enrollment = await getActiveEnrollment(user.uid);
      if (!enrollment) { setLoading(false); return; }

      const [program, allSessions, todaySessions, attendance, todayMoodLog, moodLogs] =
        await Promise.all([
          getProgramById(enrollment.programId),
          getSessionsForProgram(enrollment.programId),
          getTodaySessionsForProgram(enrollment.programId),
          getAttendanceForUser(user.uid, enrollment.programId, 200),
          getTodayMoodLog(user.uid),
          getRecentMoodLogs(user.uid, 90),
        ]);

      const today = todayStr();
      const upcomingSessions = allSessions
        .filter(s => s.date > today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .slice(0, 4);

      const presentDates = new Set(attendance.filter(a => a.present).map(a => a.date));
      const moodByDate = new Map(moodLogs.map(m => [m.date, m.mood]));
      const stats = calcStats(attendance, enrollment, program);
      const weekDays = buildWeekDays(presentDates);

      setData({
        enrollment, program, todaySessions, upcomingSessions,
        attendance, moodByDate,
        todayMood: todayMoodLog?.mood ?? null,
        stats, weekDays,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && !data) {
      getPrograms()
        .then(p => setPrograms(p.filter(x => x.isActive).sort((a, b) => a.duration - b.duration)))
        .catch(() => {});
    }
  }, [loading, data]);

  const handleMood = async (mood: string) => {
    if (!user || data?.todayMood) return;
    await saveMoodLog(user.uid, mood).catch(() => {});
    setData(prev => prev ? { ...prev, todayMood: mood } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-7 h-7 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5C6B57" }}
        />
      </div>
    );
  }

  // ── Not enrolled ─────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 300, color: "#2C2B29" }}>
            Good {greeting}, {firstName}.
          </h2>
          <p className="text-sm mt-1" style={{ color: "#4A4845" }}>You are not enrolled in any program yet.</p>
        </motion.div>

        <motion.div
          className="p-6 rounded-2xl flex items-start gap-4"
          style={{ background: "#E8E1D6", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(92,107,87,0.12)" }}>
            <Target size={18} style={{ color: "#5C6B57" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: "#2C2B29" }}>Begin your practice</p>
            <p className="text-xs leading-relaxed" style={{ color: "#4A4845" }}>
              Enroll in a program to access live sessions, track your progress, and join your mentor&apos;s cohort.
            </p>
            <motion.button
              onClick={() => router.push("/programs")}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm tracking-widest uppercase"
              style={{ background: "#5C6B57", color: "#F6F4EF", border: "none" }}
              whileHover={{ background: "#4A5948" }}
              whileTap={{ scale: 0.97 }}
            >
              View Programs <ChevronRight size={13} />
            </motion.button>
          </div>
        </motion.div>

        {programs.length > 0 && (
          <div className="space-y-3">
            {programs.map(prog => (
              <motion.div
                key={prog.id}
                className="p-5 rounded-2xl flex items-center justify-between gap-4"
                style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ borderColor: "#5C6B57" }}
              >
                <div>
                  <p className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>{prog.duration} Days</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", color: "#2C2B29", fontWeight: 400 }}>{prog.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>₹{prog.price.toLocaleString("en-IN")}</p>
                </div>
                <motion.button
                  onClick={() => setModal(prog)}
                  className="px-5 py-2 rounded-xl text-xs tracking-widest uppercase flex-shrink-0"
                  style={{ border: "1px solid #D4CCBF", color: "#5C6B57", background: "transparent" }}
                  whileHover={{ background: "#5C6B57", color: "#F6F4EF", borderColor: "#5C6B57" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Enroll
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {modal && (
          <PaymentModal
            programId={modal.id} programTitle={modal.title}
            durationDays={modal.duration} price={modal.price}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    );
  }

  // ── Enrolled dashboard ────────────────────────────────────────────────────────
  const { enrollment, program, todaySessions, upcomingSessions,
    attendance, moodByDate, todayMood, stats, weekDays } = data;

  const attendedSet = new Set(attendance.filter(a => a.present).map(a => a.date));
  const liveSession = todaySessions.find(isSessionLive);
  const duration = program?.duration ?? Number(enrollment.programId) ?? 30;

  const card = (children: React.ReactNode, className = "") => (
    <div className={`rounded-2xl p-5 md:p-6 ${className}`} style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}>
      {children}
    </div>
  );

  const sectionLabel = (text: string, right?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs tracking-widest uppercase font-medium" style={{ color: "#4A4845" }}>{text}</p>
      {right}
    </div>
  );

  const smallLink = (label: string, href: string) => (
    <Link href={href}>
      <span className="text-xs flex items-center gap-0.5" style={{ color: "#5C6B57" }}>
        {label} <ChevronRight size={12} />
      </span>
    </Link>
  );

  return (
    <div className="space-y-4 pb-10">

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.35rem, 3.5vw, 1.8rem)", fontWeight: 300, color: "#2C2B29" }}>
            Good {greeting}, {firstName} 🙏
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>
            {dateLabel} · Day {stats.currentDay} of {duration}
          </p>
        </div>

        {liveSession && (
          <div className="flex-shrink-0">
            <motion.div
              onClick={() => router.push(`/session/${liveSession.id}`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: "#1E1D1B", color: "#F6F4EF" }}
              animate={{ boxShadow: ["0 0 0 0 rgba(92,107,87,0.4)", "0 0 0 6px rgba(92,107,87,0)", "0 0 0 0 rgba(92,107,87,0.4)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              whileHover={{ background: "#2C2B29" }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE — Enter Class
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Live class banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {liveSession && (
          <motion.div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "#1E1D1B" }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#dc2626" }}>Live Now</span>
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 300, color: "#F6F4EF" }}>
                  {liveSession.title}
                </h3>
                <p className="text-xs mt-1.5" style={{ color: "rgba(246,244,239,0.5)" }}>
                  with {liveSession.mentorName} · {fmtTime(liveSession.startTime)} {liveSession.batch} batch
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <motion.button
                      onClick={() => router.push(`/session/${liveSession.id}`)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm tracking-widest uppercase"
                      style={{ background: "#5C6B57", color: "#F6F4EF", border: "none" }}
                      whileHover={{ background: "#4A5948" }} whileTap={{ scale: 0.97 }}
                    >
                      <Play size={13} fill="currentColor" /> Enter Class
                    </motion.button>
                  <motion.button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}
                    whileHover={{ background: "rgba(255,255,255,0.12)" }} whileTap={{ scale: 0.97 }}
                  >
                    <Bell size={13} /> Remind Me
                  </motion.button>
                </div>
              </div>
              <div
                className="w-16 h-16 rounded-full flex flex-col items-center justify-center flex-shrink-0 text-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#F6F4EF", lineHeight: 1 }}>{minsLeft(liveSession)}</span>
                <span style={{ fontSize: "9px", color: "rgba(246,244,239,0.5)", letterSpacing: "0.08em", marginTop: "2px" }}>MINS LEFT</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mood check-in ────────────────────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-5 md:p-6"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
      >
        <p className="text-sm mb-4" style={{ color: "#2C2B29" }}>How are you feeling today?</p>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map(m => (
            <motion.button
              key={m.label}
              onClick={() => handleMood(m.label)}
              disabled={!!todayMood}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-center"
              style={{
                border: `1px solid ${todayMood === m.label ? "#5C6B57" : "#D4CCBF"}`,
                background: todayMood === m.label ? "rgba(92,107,87,0.08)" : "transparent",
                cursor: todayMood ? "default" : "pointer",
              }}
              whileHover={!todayMood ? { borderColor: "#5C6B57", background: "rgba(92,107,87,0.05)" } : {}}
              whileTap={!todayMood ? { scale: 0.97 } : {}}
            >
              <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
              <span className="text-xs" style={{ color: todayMood === m.label ? "#5C6B57" : "#4A4845", fontWeight: todayMood === m.label ? 500 : 400 }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </div>
        {todayMood && (
          <motion.p
            className="text-xs mt-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            ✅ {todayMood} logged for today. See you in class 🙏
          </motion.p>
        )}
      </motion.div>

      {/* ── Progress banner ──────────────────────────────────────────────────── */}
      {stats.daysAttended > 0 && (
        <motion.div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
        >
          <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>🏅</span>
          <div>
            <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>
              {stats.currentStreak} day{stats.currentStreak !== 1 ? "s" : ""} strong — keep going!
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>
              {enrollment.remainingDays > 0
                ? `${enrollment.remainingDays} more session${enrollment.remainingDays !== 1 ? "s" : ""} to complete your ${duration}-Day ${program?.title ?? "program"}.`
                : `You've completed your ${duration}-Day program! 🎉`}
              {stats.completionRate >= 80 && " You're in the top practitioners this month."}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── 4 stats cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <Calendar size={16} style={{ color: "#5C6B57" }} />,
            label: "DAYS ATTENDED",
            value: String(stats.daysAttended),
            sub: stats.thisWeekCount > 0 ? `↑ +${stats.thisWeekCount} this week` : "Start your streak",
            subGreen: stats.thisWeekCount > 0,
          },
          {
            icon: <Flame size={16} style={{ color: "#5C6B57" }} />,
            label: "CURRENT STREAK",
            value: `${stats.currentStreak} 🔥`,
            sub: `Personal best: ${stats.personalBest}`,
            subGreen: false,
          },
          {
            icon: <BarChart2 size={16} style={{ color: "#5C6B57" }} />,
            label: "SESSIONS THIS MONTH",
            value: String(stats.sessionsThisMonth),
            sub: `of ${stats.possibleThisMonth} possible`,
            subGreen: false,
          },
          {
            icon: <TrendingUp size={16} style={{ color: "#5C6B57" }} />,
            label: "COMPLETION RATE",
            value: `${stats.completionRate}%`,
            sub: stats.prevMonthRate > 0
              ? `${stats.completionRate >= stats.prevMonthRate ? "↑" : "↓"} ${Math.abs(stats.completionRate - stats.prevMonthRate)}% vs last month`
              : "First month",
            subGreen: stats.completionRate >= stats.prevMonthRate && stats.prevMonthRate > 0,
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className="rounded-2xl p-4 md:p-5"
            style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(92,107,87,0.1)" }}>
              {s.icon}
            </div>
            <p className="text-[10px] tracking-widest uppercase mb-1.5" style={{ color: "#4A4845" }}>{s.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 300, color: "#2C2B29", lineHeight: 1 }}>
              {s.value}
            </p>
            <p className="text-xs mt-1.5" style={{ color: s.subGreen ? "#5C6B57" : "#4A4845", fontWeight: s.subGreen ? 500 : 400 }}>
              {s.sub}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Week practice ────────────────────────────────────────────────────── */}
      <div>

        {/* This week's practice */}
        {card(
          <>
            {sectionLabel("This Week's Practice", (
              <span className="text-xs" style={{ color: "#4A4845" }}>
                {(() => { const m = getMondayOfWeek(new Date()); const sun = new Date(m); sun.setDate(m.getDate() + 6); return `${fmtDate(m.toISOString().split("T")[0])} — ${fmtDate(sun.toISOString().split("T")[0])}`; })()}
              </span>
            ))}

            <div className="rounded-xl p-4 mb-4 flex items-center justify-between" style={{ background: "#EDEAE3" }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "1.5rem" }}>🔥</span>
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, color: "#2C2B29", lineHeight: 1 }}>
                    {stats.currentStreak}
                  </p>
                  <p className="text-[10px] tracking-widest uppercase" style={{ color: "#4A4845" }}>Day Streak</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "#4A4845" }}>Personal best</p>
                <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>{stats.personalBest} days</p>
              </div>
            </div>

            <div className="flex justify-between mb-5">
              {weekDays.map((wd, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <motion.div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      background: wd.attended ? "#5C6B57" : wd.isToday ? "rgba(92,107,87,0.15)" : wd.isClassDay && wd.isPast ? "rgba(0,0,0,0.05)" : "transparent",
                      color: wd.attended ? "#F6F4EF" : wd.isToday ? "#5C6B57" : "#4A4845",
                      border: wd.isToday && !wd.attended ? "1.5px solid #5C6B57" : "none",
                      opacity: !wd.isClassDay ? 0.35 : 1,
                    }}
                  >
                    {wd.letter}
                  </motion.div>
                  <span className="text-[9px]" style={{ color: "#4A4845" }}>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm" style={{ color: "#2C2B29", fontWeight: 500 }}>{program?.duration}-Day {program?.title}</p>
                <p className="text-xs" style={{ color: "#4A4845" }}>Day {stats.currentDay} of {duration}</p>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: "#E8E1D6" }}>
                <motion.div
                  className="h-2 rounded-full"
                  style={{ background: "#5C6B57" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.currentDay / duration) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "#4A4845" }}>
                {enrollment.remainingDays} session{enrollment.remainingDays !== 1 ? "s" : ""} to completion 🎯
              </p>
            </div>
          </>
        )}

      </div>

    </div>
  );
}
