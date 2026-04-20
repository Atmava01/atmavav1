"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play, Users, Calendar, Radio, Star,
  AlertTriangle, Bell, BellOff, Download,
  MessageSquare, CheckCircle2, XCircle,
  TrendingUp, ChevronRight, BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  getPrograms, getStudentsForProgram, getSessionsByMentor,
  getAttendanceForSession, getMentorSessionStats,
  getPaymentsByProgram, getJournalsWithRatingForProgram,
} from "@/lib/firestore";
import type { Program, Session, Attendance, JournalEntry, Payment, Enrollment, UserProfile } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtINR(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function getMonWeek(): string[] {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function calcStreak(
  uid: string,
  sessions: Session[],
  records: Record<string, Attendance[]>
): number {
  const today = new Date().toISOString().split("T")[0];
  const sorted = [...sessions]
    .filter(s => s.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const s of sorted) {
    const rec = (records[s.id] ?? []).find(a => a.userId === uid);
    if (!rec) break;
    if (rec.present) streak++;
    else break;
  }
  return streak;
}

function calcAttendanceRate(
  uid: string,
  sessions: Session[],
  records: Record<string, Attendance[]>,
  batch: string
): { present: number; total: number } {
  let present = 0, total = 0;
  for (const s of sessions) {
    const relevant = !s.batch || s.batch === batch;
    if (!relevant) continue;
    const rec = (records[s.id] ?? []).find(a => a.userId === uid);
    if (rec) {
      total++;
      if (rec.present) present++;
    }
  }
  return { present, total };
}

// ── Sub-components ───────────────────────────────────────────────────────────────

function LiveBanner({ session, onJoin }: { session: Session; onJoin: () => void }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-5 md:p-6"
      style={{
        background: "linear-gradient(135deg, #2A1F0E 0%, #3A2810 60%, #2C1F0D 100%)",
        border: "1px solid rgba(212,168,71,0.35)",
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 15% 50%, rgba(212,168,71,0.07) 0%, transparent 65%)" }}
      />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: "#ef4444" }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color: "#D4A847" }}>
              Class is Live
            </span>
          </div>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.55rem",
              color: "#F6F4EF",
              fontWeight: 300,
            }}
          >
            {session.title}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: "rgba(246,244,239,0.5)" }}>
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
            {session.batch ? ` · ${session.batch} Batch` : ""}
          </p>
        </div>
        <motion.button
          onClick={onJoin}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs tracking-widest uppercase font-semibold flex-shrink-0"
          style={{ background: "#D4A847", color: "#1A1917" }}
          whileHover={{ background: "#c4983a" }}
          whileTap={{ scale: 0.97 }}
        >
          <Radio size={13} />
          Enter as Host
        </motion.button>
      </div>
    </motion.div>
  );
}

function StatCard({
  label, value, sub, highlight = false, delay = 0,
}: {
  label: string; value: string; sub: string; highlight?: boolean; delay?: number;
}) {
  return (
    <motion.div
      className="p-4 md:p-5 rounded-2xl"
      style={{
        background: highlight ? "rgba(122,140,116,0.1)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlight ? "rgba(122,140,116,0.3)" : "rgba(255,255,255,0.08)"}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ background: highlight ? "rgba(122,140,116,0.14)" : "rgba(255,255,255,0.07)" }}
    >
      <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "rgba(246,244,239,0.4)" }}>
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "2rem",
          color: highlight ? "#7A8C74" : "#F6F4EF",
          fontWeight: 300,
        }}
      >
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>{sub}</p>
    </motion.div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────────

function OverviewSection({
  students, todaySessions, allSessions, records,
  stats, payments, liveSession, onNavigate,
}: {
  students: { enrollment: Enrollment; userProfile: UserProfile }[];
  todaySessions: Session[];
  allSessions: Session[];
  records: Record<string, Attendance[]>;
  stats: { totalSessions: number; thisMonthSessions: number; totalPresent: number; totalPossible: number };
  payments: Payment[];
  liveSession: Session | null;
  onNavigate: (tab: string) => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const monthName = now.toLocaleString("en-IN", { month: "long" });
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthPayments = payments.filter(p => p.createdAt >= monthStart);
  const mentorEarnings = Math.round(monthPayments.reduce((s, p) => s + p.amount, 0) * 0.49);

  const avgAtt = stats.totalPossible > 0
    ? Math.round((stats.totalPresent / stats.totalPossible) * 100)
    : 0;

  const weekDays = getMonWeek();
  const thisWeekSessions = allSessions.filter(s => weekDays.includes(s.date));

  return (
    <div className="space-y-5">
      {/* Live Banner */}
      {liveSession && (
        <LiveBanner
          session={liveSession}
          onJoin={() => router.push(`/session/${liveSession.id}`)}
        />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Students" value={String(students.length)} sub="enrolled in your program" delay={0} />
        <StatCard label="Avg Attendance" value={`${avgAtt}%`} sub="across all sessions" delay={0.05} />
        <StatCard label="Sessions This Month" value={String(stats.thisMonthSessions)} sub={`in ${monthName}`} delay={0.1} />
        <StatCard
          label={`${monthName} Earnings`}
          value={mentorEarnings > 0 ? fmtINR(mentorEarnings) : "₹—"}
          sub="your 49% share"
          highlight
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Sessions */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
              Today&apos;s Sessions
            </p>
            {todaySessions.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(246,244,239,0.3)" }}>No sessions scheduled today.</p>
            ) : (
              <div className="space-y-3">
                {todaySessions.map(s => {
                  const startMin = timeToMin(s.startTime);
                  const endMin = timeToMin(s.endTime);
                  const isLive = nowMin >= startMin && nowMin <= endMin;
                  const isUpcoming = nowMin < startMin;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl flex-wrap"
                      style={{
                        background: isLive ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isLive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isLive && (
                          <motion.div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: "#ef4444" }}
                            animate={{ opacity: [1, 0.25, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate" style={{ color: "#F6F4EF" }}>{s.title}</p>
                            {isLive && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded tracking-widest uppercase font-semibold flex-shrink-0"
                                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
                              >
                                Live
                              </span>
                            )}
                            {s.batch && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.45)" }}
                              >
                                {s.batch}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.4)" }}>
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLive ? (
                          <motion.button
                            onClick={() => router.push(`/session/${s.id}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-widest uppercase font-semibold"
                            style={{ background: "#ef4444", color: "#fff" }}
                            whileHover={{ background: "#dc2626" }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <Play size={10} fill="currentColor" />
                            Start Class
                          </motion.button>
                        ) : isUpcoming ? (
                          <motion.button
                            onClick={() => router.push(`/session/${s.id}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-widest uppercase"
                            style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74" }}
                            whileHover={{ background: "rgba(122,140,116,0.25)" }}
                            whileTap={{ scale: 0.96 }}
                          >
                            Prepare
                          </motion.button>
                        ) : (
                          <span className="text-xs" style={{ color: "rgba(246,244,239,0.25)" }}>Ended</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* This Week mini-table */}
            {thisWeekSessions.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: "rgba(246,244,239,0.35)" }}>
                  This Week
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: "400px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Day", "Session", "Time", "Enrolled", "Attended"].map(h => (
                          <th key={h} className="text-left py-1.5 pr-4 font-normal" style={{ color: "rgba(246,244,239,0.35)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {thisWeekSessions.map(s => {
                        const sessionRecords = records[s.id] ?? [];
                        const batchStudents = s.batch
                          ? students.filter(r => r.enrollment.batch === s.batch)
                          : students;
                        const present = sessionRecords.filter(a => a.present).length;
                        const total = batchStudents.length;
                        const isPast = s.date <= today;
                        return (
                          <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td className="py-2 pr-4" style={{ color: "rgba(246,244,239,0.5)" }}>
                              {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                            </td>
                            <td className="py-2 pr-4 truncate max-w-[120px]" style={{ color: "#F6F4EF" }}>
                              {s.title}
                            </td>
                            <td className="py-2 pr-4" style={{ color: "rgba(246,244,239,0.5)" }}>
                              {formatTime(s.startTime)}
                            </td>
                            <td className="py-2 pr-4 text-center" style={{ color: "rgba(246,244,239,0.5)" }}>
                              {total}
                            </td>
                            <td className="py-2">
                              {isPast ? (
                                <span
                                  style={{
                                    color: total === 0 ? "rgba(246,244,239,0.3)"
                                      : present / total >= 0.75 ? "#7A8C74"
                                      : present / total >= 0.5 ? "#D4A847"
                                      : "#ef4444",
                                    fontWeight: 500,
                                  }}
                                >
                                  {total === 0 ? "—" : `${present}/${total}`}
                                </span>
                              ) : (
                                <span style={{ color: "rgba(246,244,239,0.2)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
              Quick Actions
            </p>
            <div className="space-y-2">
              {[
                { icon: Calendar, label: "Add Session", tab: "sessions" as const, desc: "Schedule a new class" },
                { icon: Users, label: "All Students", tab: "students" as const, desc: `${students.length} enrolled` },
                { icon: MessageSquare, label: "Post Guide Note", tab: "guidenotes" as const, desc: "Send a note to students" },
                { icon: BookOpen, label: "View Journals", tab: "journals" as const, desc: "Student reflections" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    onClick={() => onNavigate(item.tab)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    whileHover={{ background: "rgba(255,255,255,0.07)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(122,140,116,0.15)" }}>
                      <Icon size={14} style={{ color: "#7A8C74" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: "#F6F4EF" }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: "rgba(246,244,239,0.35)" }}>{item.desc}</p>
                    </div>
                    <ChevronRight size={13} style={{ color: "rgba(246,244,239,0.25)", flexShrink: 0, marginLeft: "auto" }} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Attendance ───────────────────────────────────────────────────────────────

function AttendanceSection({
  students, sessions, records,
}: {
  students: { enrollment: Enrollment; userProfile: UserProfile }[];
  sessions: Session[];
  records: Record<string, Attendance[]>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const pastSessions = sessions.filter(s => s.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  const exportCSV = () => {
    const header = ["Student", "Batch", "Streak 🔥", "Attendance %", ...pastSessions.map(s =>
      new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    )];
    const rows = students.map(row => {
      const uid = row.userProfile.uid;
      const streak = calcStreak(uid, pastSessions, records);
      const { present, total } = calcAttendanceRate(uid, pastSessions, records, row.enrollment.batch);
      const pct = total > 0 ? `${Math.round(present / total * 100)}%` : "—";
      const cells = pastSessions.map(s => {
        const relevant = !s.batch || s.batch === row.enrollment.batch;
        if (!relevant) return "—";
        const rec = (records[s.id] ?? []).find(a => a.userId === uid);
        return rec ? (rec.present ? "P" : "A") : "?";
      });
      return [row.userProfile.name, row.enrollment.batch, String(streak), pct, ...cells];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "attendance.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#F6F4EF", fontWeight: 300 }}>
            Student Attendance
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>
            Last {pastSessions.length} sessions · {students.length} students
          </p>
        </div>
        <motion.button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs tracking-widest uppercase"
          style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.2)" }}
          whileHover={{ background: "rgba(122,140,116,0.25)" }}
          whileTap={{ scale: 0.97 }}
        >
          <Download size={12} />
          Export CSV
        </motion.button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Users size={28} style={{ color: "rgba(246,244,239,0.2)", margin: "0 auto 12px" }} />
          <p style={{ color: "rgba(246,244,239,0.4)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 300 }}>
            No students enrolled yet
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${200 + pastSessions.length * 44 + 160}px` }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="text-left px-4 py-3 sticky left-0 z-10 font-medium"
                    style={{ color: "rgba(246,244,239,0.4)", background: "rgba(20,19,17,0.98)", minWidth: 170 }}>
                    Student
                  </th>
                  {pastSessions.map(s => (
                    <th key={s.id} className="px-1.5 py-3 text-center font-normal"
                      style={{ color: "rgba(246,244,239,0.35)", minWidth: 44 }}>
                      <div>{new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                      {s.batch && (
                        <div style={{ color: "rgba(246,244,239,0.2)", fontSize: "9px" }}>{s.batch[0]}</div>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium" style={{ color: "rgba(246,244,239,0.4)", minWidth: 60 }}>🔥</th>
                  <th className="px-3 py-3 text-center font-medium" style={{ color: "rgba(246,244,239,0.4)", minWidth: 60 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row, ri) => {
                  const uid = row.userProfile.uid;
                  const streak = calcStreak(uid, pastSessions, records);
                  const { present, total } = calcAttendanceRate(uid, pastSessions, records, row.enrollment.batch);
                  const rate = total > 0 ? present / total : 1;
                  const atRisk = total > 0 && rate < 0.6;

                  return (
                    <tr
                      key={uid}
                      style={{
                        borderBottom: ri < students.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        background: atRisk ? "rgba(239,68,68,0.04)" : "transparent",
                      }}
                    >
                      {/* Name */}
                      <td className="px-4 py-2.5 sticky left-0 z-10"
                        style={{ background: atRisk ? "rgba(28,16,16,0.98)" : "rgba(18,17,14,0.98)" }}>
                        <div className="flex items-center gap-2">
                          {atRisk && <AlertTriangle size={10} style={{ color: "#f97316", flexShrink: 0 }} />}
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0"
                            style={{ background: atRisk ? "rgba(249,115,22,0.3)" : "#5C6B57", color: "#F6F4EF" }}
                          >
                            {row.userProfile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[110px]" style={{ color: atRisk ? "#f97316" : "#F6F4EF" }}>
                            {row.userProfile.name}
                          </span>
                        </div>
                      </td>
                      {/* Per-session */}
                      {pastSessions.map(s => {
                        const relevant = !s.batch || s.batch === row.enrollment.batch;
                        if (!relevant) {
                          return <td key={s.id} className="text-center px-1.5 py-2.5">
                            <span style={{ color: "rgba(246,244,239,0.1)", fontSize: 10 }}>–</span>
                          </td>;
                        }
                        const rec = (records[s.id] ?? []).find(a => a.userId === uid);
                        return (
                          <td key={s.id} className="text-center px-1.5 py-2.5">
                            {rec?.present === true && <CheckCircle2 size={12} style={{ color: "#7A8C74", margin: "0 auto" }} />}
                            {rec?.present === false && <XCircle size={12} style={{ color: "rgba(192,64,64,0.7)", margin: "0 auto" }} />}
                            {!rec && <span style={{ color: "rgba(246,244,239,0.18)", fontSize: 10 }}>?</span>}
                          </td>
                        );
                      })}
                      {/* Streak */}
                      <td className="text-center px-3 py-2.5">
                        <span style={{ color: streak >= 5 ? "#D4A847" : "rgba(246,244,239,0.45)" }}>
                          {streak > 0 ? `${streak}🔥` : "—"}
                        </span>
                      </td>
                      {/* Rate */}
                      <td className="text-center px-3 py-2.5">
                        <span style={{
                          color: total === 0 ? "rgba(246,244,239,0.25)"
                            : rate >= 0.75 ? "#7A8C74"
                            : rate >= 0.5 ? "#D4A847"
                            : "#ef4444",
                          fontWeight: 500,
                        }}>
                          {total === 0 ? "—" : `${Math.round(rate * 100)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { el: <CheckCircle2 size={10} style={{ color: "#7A8C74" }} />, label: "Present" },
              { el: <XCircle size={10} style={{ color: "rgba(192,64,64,0.7)" }} />, label: "Absent" },
              { el: <span style={{ color: "rgba(246,244,239,0.2)", fontSize: 9 }}>?</span>, label: "Not recorded" },
              { el: <AlertTriangle size={10} style={{ color: "#f97316" }} />, label: "At risk (<60%)" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                {item.el}
                <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Earnings ─────────────────────────────────────────────────────────────────

function EarningsSection({
  payments, students,
}: {
  payments: Payment[];
  students: { enrollment: Enrollment; userProfile: UserProfile }[];
}) {
  const [alerts, setAlerts] = useState({
    lowAttendance: true,
    studentMilestone: false,
    payoutReady: true,
    newFeedback: false,
  });

  const now = new Date();
  const MENTOR_SHARE = 0.49;

  // Total earnings
  const totalEarnings = Math.round(payments.reduce((s, p) => s + p.amount, 0) * MENTOR_SHARE);

  // This week
  const weekDays = getMonWeek();
  const weekPayments = payments.filter(p => weekDays.includes(p.createdAt.split("T")[0]));
  const weekEarnings = Math.round(weekPayments.reduce((s, p) => s + p.amount, 0) * MENTOR_SHARE);

  // This month
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthPayments = payments.filter(p => p.createdAt >= monthStart);
  const monthEarnings = Math.round(monthPayments.reduce((s, p) => s + p.amount, 0) * MENTOR_SHARE);

  // This year
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearPayments = payments.filter(p => p.createdAt >= yearStart);
  const yearEarnings = Math.round(yearPayments.reduce((s, p) => s + p.amount, 0) * MENTOR_SHARE);

  // Last 6 weeks bar chart
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const wkPayments = payments.filter(p => {
      const d = p.createdAt.split("T")[0];
      return d >= startStr && d <= endStr;
    });
    const amt = Math.round(wkPayments.reduce((s, p) => s + p.amount, 0) * MENTOR_SHARE);
    return { label: `W${6 - i}`, amount: amt };
  }).reverse();

  const maxBar = Math.max(...weeks.map(w => w.amount), 1);

  // Student progress by level
  const levelCounts: Record<string, number> = {};
  students.forEach(r => {
    const lvl = r.enrollment.level || "Unknown";
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
  });
  const levels = Object.entries(levelCounts).sort((a, b) => b[1] - a[1]);

  // At-risk students (just flag those with pct < 0 — placeholder; actual attendance computed elsewhere)
  // We'll just show students who joined most recently as a proxy

  // Payout history: group by month
  const payoutMonths: { month: string; amount: number; status: string }[] = [];
  const monthMap = new Map<string, number>();
  payments.forEach(p => {
    const m = p.createdAt.slice(0, 7); // YYYY-MM
    monthMap.set(m, (monthMap.get(m) ?? 0) + p.amount);
  });
  monthMap.forEach((amt, m) => {
    const [yr, mo] = m.split("-");
    payoutMonths.push({
      month: new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" }),
      amount: Math.round(amt * MENTOR_SHARE),
      status: m < monthStart.slice(0, 7) ? "Paid" : "Pending",
    });
  });
  payoutMonths.sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-5">
      {/* Earnings dark card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #1A1208 0%, #261A0A 60%, #1C1308 100%)",
          border: "1px solid rgba(212,168,71,0.25)",
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(212,168,71,0.06) 0%, transparent 60%)" }} />
        <div className="relative">
          <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(212,168,71,0.6)" }}>
            Your Earnings
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", color: "#F6F4EF", fontWeight: 300, lineHeight: 1 }}>
            {totalEarnings > 0 ? fmtINR(totalEarnings) : "₹0"}
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
            49% of ₹{((totalEarnings / 0.49) / 100).toLocaleString("en-IN")} gross revenue
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase font-semibold"
              style={{ background: "#D4A847", color: "#1A1917" }}
              whileHover={{ background: "#c4983a" }}
              whileTap={{ scale: 0.97 }}
            >
              <TrendingUp size={12} />
              Request Payout
            </motion.button>
            <p className="text-[10px]" style={{ color: "rgba(246,244,239,0.3)" }}>via Razorpay · 2–3 business days</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart + summaries */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bar chart */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
              Weekly Earnings
            </p>
            <div className="flex items-end gap-2 h-28">
              {weeks.map(w => {
                const barH = maxBar > 0 ? Math.max((w.amount / maxBar) * 100, 4) : 4;
                return (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <motion.div
                      className="w-full rounded-t-lg"
                      style={{
                        background: w.amount > 0 ? "rgba(212,168,71,0.7)" : "rgba(255,255,255,0.06)",
                        height: `${barH}%`,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${barH}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      title={fmtINR(w.amount)}
                    />
                    <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>{w.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summaries */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "This Week", value: fmtINR(weekEarnings) },
              { label: "This Month", value: fmtINR(monthEarnings) },
              { label: "This Year", value: fmtINR(yearEarnings) },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.35)" }}>
                  {item.label}
                </p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "#F6F4EF", fontWeight: 300 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Payout History */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
                Payout History
              </p>
            </div>
            {payoutMonths.length === 0 ? (
              <div className="px-5 py-6">
                <p className="text-sm" style={{ color: "rgba(246,244,239,0.3)" }}>No payouts yet.</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    {["Period", "Amount", "Status"].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 font-normal"
                        style={{ color: "rgba(246,244,239,0.35)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutMonths.slice(0, 6).map((p) => (
                    <tr key={p.month}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-5 py-3" style={{ color: "#F6F4EF" }}>{p.month}</td>
                      <td className="px-5 py-3" style={{ color: "#D4A847" }}>{fmtINR(p.amount)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px]"
                          style={{
                            background: p.status === "Paid" ? "rgba(122,140,116,0.2)" : "rgba(212,168,71,0.15)",
                            color: p.status === "Paid" ? "#7A8C74" : "#D4A847",
                          }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column: Student Progress + Alerts + At Risk */}
        <div className="space-y-4">
          {/* Student Progress by level */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
              Student Progress
            </p>
            {levels.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>No enrollment data.</p>
            ) : (
              <div className="space-y-3">
                {levels.map(([level, count]) => (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "rgba(246,244,239,0.6)" }}>{level}</span>
                      <span className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "#7A8C74" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((count / students.length) * 100)}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminders & Alerts */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(246,244,239,0.4)" }}>
              Reminders & Alerts
            </p>
            <div className="space-y-3">
              {[
                { key: "lowAttendance", label: "Low attendance alerts" },
                { key: "studentMilestone", label: "Student milestones" },
                { key: "payoutReady", label: "Payout ready" },
                { key: "newFeedback", label: "New student feedback" },
              ].map(item => {
                const k = item.key as keyof typeof alerts;
                const on = alerts[k];
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(246,244,239,0.6)" }}>{item.label}</span>
                    <motion.button
                      onClick={() => setAlerts(prev => ({ ...prev, [k]: !prev[k] }))}
                      className="flex items-center gap-1.5"
                      whileTap={{ scale: 0.9 }}
                    >
                      {on
                        ? <Bell size={13} style={{ color: "#7A8C74" }} />
                        : <BellOff size={13} style={{ color: "rgba(246,244,239,0.25)" }} />}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Students At Risk */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={13} style={{ color: "#f97316" }} />
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#f97316" }}>
                Students At Risk
              </p>
            </div>
            {students.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>No data yet.</p>
            ) : (
              <div className="space-y-2">
                {students.slice(0, 3).map(row => (
                  <div key={row.userProfile.uid}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] flex-shrink-0"
                        style={{ background: "rgba(249,115,22,0.25)", color: "#f97316" }}>
                        {row.userProfile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs truncate" style={{ color: "#F6F4EF" }}>
                        {row.userProfile.name.split(" ")[0]}
                      </span>
                    </div>
                    <motion.button
                      className="text-[10px] px-2.5 py-1 rounded-lg tracking-widest uppercase flex-shrink-0"
                      style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                      whileHover={{ background: "rgba(249,115,22,0.25)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Reach Out
                    </motion.button>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>All students are on track 🌿</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Feedback ─────────────────────────────────────────────────────────────────

function FeedbackSection({ journals }: { journals: JournalEntry[] }) {
  const avgRating = journals.length > 0
    ? journals.reduce((s, j) => s + (j.rating ?? 0), 0) / journals.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#F6F4EF", fontWeight: 300 }}>
            Student Feedback
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>
            {journals.length} shared journal entries with ratings
          </p>
        </div>
        {journals.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "rgba(212,168,71,0.1)", border: "1px solid rgba(212,168,71,0.2)" }}>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={13}
                  fill={i <= Math.round(avgRating) ? "#D4A847" : "none"}
                  style={{ color: "#D4A847" }}
                />
              ))}
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", color: "#D4A847", fontWeight: 300 }}>
              {avgRating.toFixed(1)}
            </span>
            <span className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>avg</span>
          </div>
        )}
      </div>

      {journals.length === 0 ? (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Star size={28} style={{ color: "rgba(246,244,239,0.2)", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "rgba(246,244,239,0.4)", fontWeight: 300 }}>
            No student feedback yet
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.25)" }}>
            Students who rate their sessions will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {journals.map((j, i) => (
            <motion.div
              key={j.id}
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    size={12}
                    fill={n <= (j.rating ?? 0) ? "#D4A847" : "none"}
                    style={{ color: n <= (j.rating ?? 0) ? "#D4A847" : "rgba(246,244,239,0.2)" }}
                  />
                ))}
                <span className="text-[10px] ml-1" style={{ color: "rgba(246,244,239,0.35)" }}>
                  {j.rating}/5
                </span>
              </div>
              {/* Content */}
              <p className="text-sm leading-relaxed mb-3 line-clamp-3"
                style={{ color: "rgba(246,244,239,0.7)", fontStyle: "italic" }}>
                &ldquo;{j.content.slice(0, 160)}{j.content.length > 160 ? "…" : ""}&rdquo;
              </p>
              {/* Footer */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#F6F4EF" }}>{j.userName}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>
                    {new Date(j.date + "T00:00:00").toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {j.feeling && ` · ${j.feeling}`}
                  </p>
                </div>
                <motion.button
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-widest uppercase"
                  style={{ background: "rgba(122,140,116,0.12)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.15)" }}
                  whileHover={{ background: "rgba(122,140,116,0.22)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageSquare size={10} />
                  Reply
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────────

export function MentorOverview() {
  const { user, userProfile } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [students, setStudents] = useState<{ enrollment: Enrollment; userProfile: UserProfile }[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [records, setRecords] = useState<Record<string, Attendance[]>>({});
  const [stats, setStats] = useState({ totalSessions: 0, thisMonthSessions: 0, totalPresent: 0, totalPossible: 0 });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const today = new Date().toISOString().split("T")[0];

  const navigateSidebar = useCallback((id: string) => {
    // This will be called only for sidebar items — we emit a custom event
    window.dispatchEvent(new CustomEvent("mentor-navigate", { detail: id }));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [allPrograms, mentorSessions, mentorStats] = await Promise.all([
          getPrograms(),
          getSessionsByMentor(user!.uid),
          getMentorSessionStats(user!.uid),
        ]);
        if (cancelled) return;

        const myProgram = allPrograms.find(p => p.mentorId === user!.uid) ?? null;
        setProgram(myProgram);
        setAllSessions(mentorSessions);
        setStats(mentorStats);

        if (myProgram) {
          const rows = await getStudentsForProgram(myProgram.id);
          if (!cancelled) setStudents(rows);
        }

        if (myProgram) {
          const [pmnts, jrnls] = await Promise.all([
            getPaymentsByProgram(myProgram.id),
            getJournalsWithRatingForProgram(myProgram.id),
          ]);
          if (!cancelled) {
            setPayments(pmnts);
            setJournals(jrnls);
          }

          // Load attendance for all past sessions
          const past = mentorSessions.filter(s => s.date <= today);
          const attendanceMap: Record<string, Attendance[]> = {};
          await Promise.all(
            past.map(async s => {
              attendanceMap[s.id] = await getAttendanceForSession(s.id);
            })
          );
          if (!cancelled) setRecords(attendanceMap);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid, userProfile?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for sidebar navigation events
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      window.dispatchEvent(new CustomEvent("mentor-set-active", { detail: id }));
    };
    window.addEventListener("mentor-navigate", handler);
    return () => window.removeEventListener("mentor-navigate", handler);
  }, []);

  // Detect live session
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todaySessions = allSessions.filter(s => s.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const liveSession = todaySessions.find(s => {
    const sm = timeToMin(s.startTime);
    const em = timeToMin(s.endTime);
    return nowMin >= sm && nowMin <= em;
  }) ?? null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Good {greeting}</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.1rem", color: "#F6F4EF", fontWeight: 300 }}>
          {userProfile?.name?.split(" ")[0] ?? "Mentor"}.
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: "linear-gradient(135deg, rgba(122,140,116,0.14) 0%, rgba(255,255,255,0.04) 100%)",
          border: "1px solid rgba(122,140,116,0.22)",
        }}
      >
        <div>
          <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(122,140,116,0.85)" }}>
            Assigned Program
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.45rem", color: "#F6F4EF", fontWeight: 300 }}>
            {program?.title ?? "No program assigned"}
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.35)" }}>
            {program
              ? `${program.duration} days${program.mentorName ? ` · Mentor record: ${program.mentorName}` : ""}`
              : "Ask admin to assign this mentor to a Firestore program."}
          </p>
        </div>
        {program && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-[10px] tracking-widest uppercase"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.6)" }}
            >
              {program.id}
            </span>
            <span
              className="px-3 py-1 rounded-full text-[10px] tracking-widest uppercase"
              style={{ background: "rgba(122,140,116,0.18)", color: "#7A8C74" }}
            >
              {students.length} students
            </span>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#7A8C74" }}
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          <OverviewSection
            students={students}
            todaySessions={todaySessions}
            allSessions={allSessions}
            records={records}
            stats={stats}
            payments={payments}
            liveSession={liveSession}
            onNavigate={navigateSidebar}
          />
          <AttendanceSection
            students={students}
            sessions={allSessions}
            records={records}
          />
          <EarningsSection
            payments={payments}
            students={students}
          />
          <FeedbackSection journals={journals} />
        </motion.div>
      )}
    </div>
  );
}
