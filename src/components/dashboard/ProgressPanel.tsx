"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart2, Flame, Target, TrendingUp, AlertCircle,
  Calendar, Activity, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, getAttendanceForUser, getRecentMoodLogs } from "@/lib/firestore";
import type { Enrollment, Attendance } from "@/types";
import type { MoodLog } from "@/lib/firestore";
import Link from "next/link";

function calcStreak(presentDates: Set<string>): number {
  let streak = 0;
  const cur = new Date();
  const todayStr = cur.toISOString().split("T")[0];
  for (let i = 0; i < 200; i++) {
    const d = cur.toISOString().split("T")[0];
    const dow = cur.getDay();
    if (dow === 0) { cur.setDate(cur.getDate() - 1); continue; }
    if (d === todayStr && !presentDates.has(d)) { cur.setDate(cur.getDate() - 1); continue; }
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

// ISO week string: YYYY-Www
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Get the Monday of the ISO week for display label
function getWeekLabel(weekStr: string): string {
  const [year, week] = weekStr.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
  return monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const MOOD_COLORS: Record<string, string> = {
  "Tired":     "#94a3b8",
  "Neutral":   "#cbd5e1",
  "Good":      "#86efac",
  "Energised": "#4ade80",
  "Motivated": "#5C6B57",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProgressPanel() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e);
      if (e) {
        const [att, moods] = await Promise.all([
          getAttendanceForUser(user.uid, e.programId, 200),
          getRecentMoodLogs(user.uid, 90),
        ]);
        setAttendance(att);
        setMoodLogs(moods);
      }
      setLoading(false);
    })();
  }, [user]);

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

  const presentDates = new Set(attendance.filter(a => a.present).map(a => a.date));
  const streak = calcStreak(presentDates);
  const personalBest = calcPersonalBest(presentDates);
  const total = presentDates.size;

  // Program completion
  const startDate = new Date(enrollment.startDate + "T00:00:00");
  const endDate = new Date(enrollment.endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalProgramDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays = Math.min(totalProgramDays, Math.max(0, Math.round((today.getTime() - startDate.getTime()) / 86400000)));
  const completionPct = Math.round((elapsedDays / totalProgramDays) * 100);

  // Attendance rate (Mon–Sat from start to today)
  let possibleDays = 0;
  const cur = new Date(startDate);
  while (cur <= today) {
    if (cur.getDay() !== 0) possibleDays++;
    cur.setDate(cur.getDate() + 1);
  }
  const attendanceRate = possibleDays > 0 ? Math.round((total / possibleDays) * 100) : 0;

  // This month stats
  const thisMonth = today.toISOString().slice(0, 7);
  const thisMonthCount = Array.from(presentDates).filter(d => d.startsWith(thisMonth)).length;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let possibleThisMonth = 0;
  const mc = new Date(monthStart);
  while (mc <= today) { if (mc.getDay() !== 0) possibleThisMonth++; mc.setDate(mc.getDate() + 1); }

  // Last 8 weeks bar chart
  const weekKeys: string[] = [];
  const d = new Date(today);
  for (let i = 7; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i * 7);
    const wk = getISOWeek(dt);
    if (!weekKeys.includes(wk)) weekKeys.push(wk);
  }
  const weekCounts = weekKeys.map(wk => {
    let count = 0;
    presentDates.forEach(dateStr => {
      if (getISOWeek(new Date(dateStr + "T00:00:00")) === wk) count++;
    });
    return { week: wk, count, label: getWeekLabel(wk) };
  });
  const maxWeekCount = Math.max(6, ...weekCounts.map(w => w.count));
  const currentWeek = getISOWeek(today);

  // Heatmap: last 12 weeks organized by week columns
  const heatmapDays: string[] = [];
  for (let i = 83; i >= 0; i--) {
    const hd = new Date(today);
    hd.setDate(today.getDate() - i);
    heatmapDays.push(hd.toISOString().split("T")[0]);
  }
  // Pad so first day is Monday
  const firstDow = new Date(heatmapDays[0] + "T00:00:00").getDay();
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
  const paddedDays: (string | null)[] = [
    ...Array(mondayOffset).fill(null),
    ...heatmapDays,
  ];
  // Group into weeks of 7
  const heatmapWeeks: (string | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    heatmapWeeks.push(paddedDays.slice(i, i + 7));
  }

  // Mood distribution (last 60 days)
  const last60 = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const hd = new Date(today);
    hd.setDate(today.getDate() - i);
    last60.add(hd.toISOString().split("T")[0]);
  }
  const moodByDate = new Map(moodLogs.map(m => [m.date, m.mood]));
  const moodCounts: Record<string, number> = {};
  last60.forEach(d => {
    const mood = moodByDate.get(d);
    if (mood) moodCounts[mood] = (moodCounts[mood] ?? 0) + 1;
  });
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);

  // Day-of-week breakdown
  const dowCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  presentDates.forEach(dateStr => {
    const dow = new Date(dateStr + "T00:00:00").getDay();
    if (dow !== 0) dowCounts[dow] = (dowCounts[dow] ?? 0) + 1;
  });
  const maxDow = Math.max(1, ...Object.values(dowCounts));

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Progress
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>Your practice statistics and trends</p>
      </div>

      {/* Program Progress Hero */}
      <motion.div
        className="rounded-2xl p-6"
        style={{ background: "#1E1D1B" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Program Progress</p>
            <p className="text-3xl font-light" style={{ color: "#F6F4EF" }}>{completionPct}%</p>
            <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.45)" }}>
              Day {elapsedDays} of {totalProgramDays} · {enrollment.remainingDays} days remaining
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Attendance Rate</p>
            <p className="text-3xl font-light" style={{ color: "#7A9C74" }}>{attendanceRate}%</p>
            <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.45)" }}>
              {total} of {possibleDays} sessions
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(to right, #5C6B57, #7A9C74)" }}
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Target,     label: "Total Sessions",  value: total,        sub: "attended" },
          { icon: Flame,      label: "Current Streak",  value: streak,       sub: "consecutive days" },
          { icon: TrendingUp, label: "Personal Best",   value: personalBest, sub: "day streak" },
          { icon: BarChart2,  label: "This Month",      value: thisMonthCount, sub: `of ${possibleThisMonth} possible` },
        ].map(({ icon: Icon, label, value, sub }, i) => (
          <motion.div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 + 0.1 }}
          >
            <Icon size={14} style={{ color: "#5C6B57", marginBottom: 10 }} />
            <p className="text-2xl font-light" style={{ color: "#2C2B29" }}>{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "#2C2B29" }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9A9490" }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly Attendance Chart */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Activity size={13} style={{ color: "#5C6B57" }} />
          <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>Weekly Attendance — Last 8 Weeks</p>
        </div>
        <div className="flex items-end gap-2 h-24">
          {weekCounts.map(({ week, count, label }) => {
            const isCurrentWeek = week === currentWeek;
            const barHeight = maxWeekCount > 0 ? (count / maxWeekCount) * 100 : 0;
            return (
              <div key={week} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: 80 }}>
                  <motion.div
                    className="w-full rounded-lg"
                    style={{
                      background: isCurrentWeek ? "#5C6B57" : count > 0 ? "#A8BAA4" : "#F0EBE3",
                      minHeight: count > 0 ? 4 : 2,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(barHeight, count > 0 ? 5 : 2)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
                  />
                </div>
                <span className="text-[9px]" style={{ color: isCurrentWeek ? "#5C6B57" : "#9A9490" }}>
                  {isCurrentWeek ? "Now" : label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #F0EBE3" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#5C6B57" }} />
            <span className="text-xs" style={{ color: "#4A4845" }}>This week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#A8BAA4" }} />
            <span className="text-xs" style={{ color: "#4A4845" }}>Past weeks</span>
          </div>
        </div>
      </motion.div>

      {/* Heatmap — 12 weeks grid */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={13} style={{ color: "#5C6B57" }} />
          <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>Attendance Heatmap — Last 12 Weeks</p>
        </div>
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1" style={{ paddingTop: 0 }}>
            {DAY_LABELS.map(l => (
              <div key={l} className="h-5 flex items-center">
                <span className="text-[9px]" style={{ color: "#9A9490", width: 24 }}>{l}</span>
              </div>
            ))}
            <div className="h-5 flex items-center">
              <span className="text-[9px]" style={{ color: "#9A9490", width: 24, opacity: 0.4 }}>Sun</span>
            </div>
          </div>
          {/* Week columns */}
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
                {week.map((dateStr, di) => {
                  if (!dateStr) {
                    return <div key={di} className="w-5 h-5" />;
                  }
                  const isSun = new Date(dateStr + "T00:00:00").getDay() === 0;
                  const attended = presentDates.has(dateStr);
                  const isToday = dateStr === today.toISOString().split("T")[0];
                  return (
                    <div
                      key={dateStr}
                      title={dateStr}
                      className="w-5 h-5 rounded"
                      style={{
                        background: attended ? "#5C6B57" : isSun ? "rgba(0,0,0,0.03)" : "#F0EBE3",
                        border: isToday ? "1.5px solid #7A8C74" : "1.5px solid transparent",
                        opacity: isSun ? 0.35 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid #F0EBE3" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: "#5C6B57" }} />
            <span className="text-xs" style={{ color: "#4A4845" }}>Attended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: "#F0EBE3" }} />
            <span className="text-xs" style={{ color: "#4A4845" }}>Missed</span>
          </div>
        </div>
      </motion.div>

      {/* Day-of-week breakdown */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap size={13} style={{ color: "#5C6B57" }} />
          <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>Most Active Day of Week</p>
        </div>
        <div className="flex gap-2 items-end" style={{ height: 56 }}>
          {[1, 2, 3, 4, 5, 6].map((dow, i) => {
            const count = dowCounts[dow] ?? 0;
            const barPct = (count / maxDow) * 100;
            const isBest = count === maxDow && maxDow > 0;
            return (
              <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: 40 }}>
                  <motion.div
                    className="w-full rounded"
                    style={{ background: isBest ? "#5C6B57" : "#E8E1D6", minHeight: 2 }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(barPct, count > 0 ? 8 : 4)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 + i * 0.06 }}
                  />
                </div>
                <span className="text-[9px]" style={{ color: isBest ? "#5C6B57" : "#9A9490" }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Mood Distribution */}
      {totalMoods > 0 && (
        <motion.div
          className="rounded-2xl p-5"
          style={{ background: "#fff", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <p className="text-xs font-medium mb-4" style={{ color: "#2C2B29" }}>Mood Distribution — Last 60 Days</p>
          <div className="space-y-3">
            {Object.entries(moodCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([mood, count]) => (
                <div key={mood} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: MOOD_COLORS[mood] ?? "#5C6B57" }}
                  />
                  <span className="text-xs w-20 flex-shrink-0" style={{ color: "#4A4845" }}>{mood}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "#F0EBE3" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: MOOD_COLORS[mood] ?? "#5C6B57" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / totalMoods) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                    />
                  </div>
                  <span className="text-xs w-6 text-right tabular-nums" style={{ color: "#9A9490" }}>{count}</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
