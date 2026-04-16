"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Layers, AlertCircle, Calendar, Target, Clock, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveEnrollment, getProgramById, getAttendanceForUser,
  subscribeGuideNotesForUser,
} from "@/lib/firestore";
import type { Enrollment, Program, Attendance, GuideNote } from "@/types";
import Link from "next/link";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysLeft(endDate: string) {
  const end = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
}

function daysSince(startDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000)) + 1;
}

function countClassDays(startStr: string, endStr: string) {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) { if (cur.getDay() !== 0) count++; cur.setDate(cur.getDate() + 1); }
  return count;
}

function countClassDaysSince(startStr: string) {
  return countClassDays(startStr, new Date().toISOString().split("T")[0]);
}

const MILESTONES = [
  { pct: 0, label: "Day 1 — You began", icon: "🌱" },
  { pct: 25, label: "25% — Building momentum", icon: "🌿" },
  { pct: 50, label: "Halfway — Deep in practice", icon: "🌳" },
  { pct: 75, label: "75% — Almost there", icon: "🌺" },
  { pct: 100, label: "Complete — Inner Mastery", icon: "✨" },
];

/** Returns milestone label+icon for a specific calendar day (1-based), given total duration. */
function getMilestonesForDay(duration: number): Record<number, { label: string; icon: string }> {
  const m: Record<number, { label: string; icon: string }> = {
    1:  { label: "Started Foundation",       icon: "🌱" },
    7:  { label: "7-Day Warrior Badge",       icon: "🔥" },
    14: { label: "First 2 Weeks Complete",    icon: "🌙" },
    21: { label: "3 Weeks Strong",            icon: "✨" },
    30: { label: "30-Day Devotee Badge",      icon: "🏆" },
  };
  if (duration >= 60) {
    m[50] = { label: "Iron Will Badge",       icon: "💎" };
  }
  if (duration >= 90) {
    m[60] = { label: "60-Day Master Badge",   icon: "🌺" };
    m[75] = { label: "75 Days Strong",        icon: "🔮" };
  }
  // Final day
  m[duration] = { label: "Program Complete · Inner Master Badge", icon: "🙌" };
  return m;
}

// ─── Daily Timeline ────────────────────────────────────────────────────────────

function DailyTimeline({
  startDate,
  duration,
  currentDay,
}: {
  startDate: string;
  duration: number;
  currentDay: number; // 1-based calendar days since enrollment start
}) {
  const todayRef = useRef<HTMLDivElement>(null);
  const milestones = getMilestonesForDay(duration);

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const days = Array.from({ length: duration }, (_, i) => i + 1);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid #D4CCBF" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>Journey Timeline</p>
        <span className="text-xs" style={{ color: "#9A9490" }}>Day {currentDay} of {duration}</span>
      </div>

      {/* Scrollable day list */}
      <div
        className="overflow-y-auto px-5 pb-5"
        style={{ maxHeight: 320 }}
      >
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[15px] top-0 bottom-0 w-px"
            style={{ background: "#E8E1D6" }}
          />

          <div className="space-y-0">
            {days.map(day => {
              const dateStr = addDays(startDate, day - 1);
              const isPast    = day < currentDay;
              const isToday   = day === currentDay;
              const isFuture  = day > currentDay;
              const milestone = milestones[day];

              return (
                <div
                  key={day}
                  ref={isToday ? todayRef : undefined}
                  className="flex items-center gap-3 py-1.5 relative"
                >
                  {/* Node */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full z-10"
                    style={{
                      width: 30,
                      height: 30,
                      background: isToday
                        ? "#5C6B57"
                        : isPast
                          ? milestone ? "#5C6B57" : "#E8E1D6"
                          : "#F6F4EF",
                      border: isToday
                        ? "2px solid #5C6B57"
                        : isPast
                          ? milestone ? "2px solid #5C6B57" : "2px solid #D4CCBF"
                          : "2px solid #E8E1D6",
                      fontSize: isToday ? 14 : milestone && (isPast || isToday) ? 14 : 9,
                      boxShadow: isToday ? "0 0 0 4px rgba(92,107,87,0.15)" : "none",
                    }}
                  >
                    {isToday ? (
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontSize: 12, fontWeight: 600 }}>▲</span>
                    ) : milestone && isPast ? (
                      <span>{milestone.icon}</span>
                    ) : isPast ? (
                      <span style={{ color: "#9A9490", fontSize: 8 }}>✓</span>
                    ) : milestone ? (
                      <span style={{ color: "#C4BDB5", fontSize: 9 }}>{day}</span>
                    ) : (
                      <span style={{ color: "#C4BDB5", fontSize: 8 }}>{day}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div>
                      {isToday ? (
                        <>
                          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#5C6B57" }}>
                            Day {day} · {fmtShort(dateStr)} · Today
                          </p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: "#2C2B29" }}>
                            YOU ARE HERE 🙏 — Keep going
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px]" style={{ color: isPast ? "#9A9490" : "#C4BDB5" }}>
                            Day {day} · {fmtShort(dateStr)}
                          </p>
                          {milestone && (
                            <p className="text-xs mt-0.5" style={{ color: isPast ? "#2C2B29" : "#C4BDB5", fontWeight: isPast ? 500 : 400 }}>
                              {milestone.label} {milestone.icon}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {isFuture && milestone && (
                      <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: "#C4BDB5" }}>
                        {day - currentDay}d away
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Note from Guide ──────────────────────────────────────────────────────────

function GuideNoteCard({ note }: { note: GuideNote }) {
  const initials = note.mentorName.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      className="rounded-2xl p-4"
      style={{ background: "#fff", border: "1px solid #D4CCBF" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {note.mentorPhotoURL ? (
          <img src={note.mentorPhotoURL} alt={note.mentorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 select-none text-xs"
            style={{ background: "radial-gradient(circle at 35% 35%, #7A8C74, #3D4A39)", color: "rgba(246,244,239,0.9)", fontFamily: "'Cormorant Garamond', serif" }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{note.mentorName}</p>
          <p className="text-[10px]" style={{ color: "#9A9490" }}>
            {timeAgo(note.createdAt)}
            {note.targetUserId !== null && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.1)", color: "#5C6B57" }}>
                Personal
              </span>
            )}
          </p>
        </div>
      </div>

      <p className="text-sm font-medium mb-1.5" style={{ color: "#2C2B29" }}>{note.title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300, whiteSpace: "pre-wrap" }}>
        {note.content}
      </p>
    </motion.div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function JourneyPanel() {
  const { user, userProfile } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [program, setProgram]       = useState<Program | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [guideNotes, setGuideNotes] = useState<GuideNote[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e);
      if (e) {
        const [p, att] = await Promise.all([
          getProgramById(e.programId),
          getAttendanceForUser(user.uid, e.programId, 200),
        ]);
        setProgram(p);
        setAttendance(att);
      }
      setLoading(false);
    })();
  }, [user]);

  // Subscribe to guide notes once enrollment is known
  useEffect(() => {
    if (!user || !enrollment) return;
    const unsub = subscribeGuideNotesForUser(user.uid, enrollment.programId, setGuideNotes);
    return unsub;
  }, [user, enrollment?.programId]);

  if (loading || enrollment === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "#D4CCBF", borderTopColor: "#5C6B57" }} />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <AlertCircle size={40} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
        <p className="text-sm" style={{ color: "#4A4845" }}>No active enrollment found.</p>
        <Link href="/programs">
          <motion.button className="mt-4 px-5 py-2.5 rounded-xl text-sm" style={{ background: "#5C6B57", color: "#F6F4EF" }}
            whileHover={{ background: "#4A5845" }} whileTap={{ scale: 0.97 }}>
            Browse Programs
          </motion.button>
        </Link>
      </div>
    );
  }

  const totalClassDays   = countClassDays(enrollment.startDate, enrollment.endDate);
  const classDaysSoFar   = countClassDaysSince(enrollment.startDate);
  const daysAttended     = attendance.filter(a => a.present).length;
  const remaining        = daysLeft(enrollment.endDate);
  const calendarDaysSince = daysSince(enrollment.startDate);
  const progressPct      = Math.min(100, Math.round((classDaysSoFar / Math.max(1, totalClassDays)) * 100));
  const duration         = program?.duration ?? parseInt(enrollment.programId, 10) ?? 30;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          My Journey
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
          {program?.title ?? `${duration}-Day Program`} · {enrollment.batch} Batch · {enrollment.level}
        </p>
      </div>

      {/* Progress Hero */}
      <motion.div
        className="rounded-2xl p-6"
        style={{ background: "#1E1D1B", color: "#F6F4EF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Progress</p>
            <p className="text-3xl font-light">{progressPct}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>Day</p>
            <p className="text-3xl font-light">
              {calendarDaysSince}{" "}
              <span className="text-base" style={{ color: "rgba(246,244,239,0.4)" }}>/ {duration}</span>
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "#7A8C74" }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: "rgba(246,244,239,0.5)" }}>
          <span>{fmtDate(enrollment.startDate)}</span>
          <span>{fmtDate(enrollment.endDate)}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Target,   label: "Sessions Attended", value: daysAttended },
          { icon: Calendar, label: "Days Remaining",    value: remaining },
          { icon: Layers,   label: "Total Class Days",  value: totalClassDays },
          { icon: Clock,    label: "Elapsed Days",      value: calendarDaysSince },
        ].map(({ icon: Icon, label, value }, i) => (
          <motion.div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
          >
            <Icon size={14} style={{ color: "#5C6B57", marginBottom: 8 }} />
            <p className="text-2xl font-light" style={{ color: "#2C2B29" }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Daily Journey Timeline ──────────────────────────────────────────── */}
      <DailyTimeline
        startDate={enrollment.startDate}
        duration={duration}
        currentDay={calendarDaysSince}
      />

      {/* ── Note from Guide ─────────────────────────────────────────────────── */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <BookOpen size={13} style={{ color: "#5C6B57" }} />
          <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>Note from Guide</p>
          {guideNotes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.1)", color: "#5C6B57" }}>
              {guideNotes.length}
            </span>
          )}
        </div>

        {guideNotes.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: "#fff", border: "1px dashed #D4CCBF" }}
          >
            <p className="text-sm" style={{ color: "#C4BDB5", fontWeight: 300 }}>
              No notes from your guide yet
            </p>
            <p className="text-xs mt-1" style={{ color: "#D4CCBF" }}>
              Your mentor's messages will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {guideNotes.map(note => (
              <GuideNoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Milestones (kept for quick overview) */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <p className="text-xs font-medium mb-5" style={{ color: "#2C2B29" }}>Journey Milestones</p>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px" style={{ background: "#D4CCBF" }} />
          <div className="space-y-4">
            {MILESTONES.map((m) => {
              const reached = progressPct >= m.pct;
              return (
                <div key={m.pct} className="flex items-center gap-4 relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base z-10"
                    style={{
                      background: reached ? "#5C6B57" : "#F0EBE3",
                      border: `2px solid ${reached ? "#5C6B57" : "#D4CCBF"}`,
                    }}
                  >
                    {reached ? m.icon : <span style={{ fontSize: 10, color: "#9A9490" }}>{m.pct}%</span>}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: reached ? "#2C2B29" : "#9A9490", fontWeight: reached ? 500 : 400 }}>
                      {m.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Enrollment Details */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "#2C2B29" }}>Enrollment Details</p>
        <div className="space-y-2">
          {[
            ["Program",     program?.title ?? `${duration}-Day Program`],
            ["Batch",       enrollment.batch],
            ["Level",       enrollment.level],
            ["Start Date",  fmtDate(enrollment.startDate)],
            ["End Date",    fmtDate(enrollment.endDate)],
            ["Enrolled By", enrollment.grantedByAdmin ? "Admin Grant" : "Payment"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid #F0EBE3" }}>
              <span className="text-xs" style={{ color: "#4A4845" }}>{k}</span>
              <span className="text-xs font-medium" style={{ color: "#2C2B29" }}>{v}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
