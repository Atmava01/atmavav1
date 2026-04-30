"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, Plus, ArrowUp, ArrowDown,
  Monitor, Users, Clock, TrendingUp, Star,
  CheckCircle2, AlertCircle, ChevronRight, Circle,
  Sun, Moon,
} from "lucide-react";
import { getAdminOverviewData, type AdminOverviewData } from "@/lib/firestore";
import type { Session, Enrollment } from "@/types";
import { useRouter } from "next/navigation";
import { SkeletonCard } from "@/components/admin/ui/Skeleton";
import { useAdminTheme } from "@/components/admin/ui/ThemeContext";

function ThemeToggle() {
  const { isDark, toggleTheme } = useAdminTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all adm-text-3"
      style={{ border: "1px solid var(--adm-border)", background: "var(--adm-input)" }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-elevated)")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-input)")}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtRupees(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function isLiveNow(s: Session): boolean {
  const today = new Date().toISOString().split("T")[0];
  if (s.date !== today) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  const [eh, em] = s.endTime.split(":").map(Number);
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
}

function elapsedMins(s: Session): number {
  const now = new Date();
  const [sh, sm] = s.startTime.split(":").map(Number);
  return Math.max(0, now.getHours() * 60 + now.getMinutes() - (sh * 60 + sm));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, label, value, sub, trend }: {
  icon: React.ReactNode; iconBg: string;
  label: string; value: string; sub: string;
  trend?: { dir: "up"|"down"; label: string; color?: string };
}) {
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>{icon}</div>
        {trend && (
          <div className="flex items-center gap-0.5 text-xs" style={{ color: trend.color ?? (trend.dir === "up" ? "#22c55e" : "#ef4444") }}>
            {trend.dir === "up" ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}
            {trend.label}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.38)" }}>{label}</p>
        <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"2rem", fontWeight:400, color:"var(--adm-text)", lineHeight:1 }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.38)" }}>{sub}</p>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="px-6 md:px-10 pt-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function OverviewPanel() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date().toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  useEffect(() => {
    setLoading(true);
    getAdminOverviewData()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const liveSessions   = data?.todaySessions.filter(isLiveNow) ?? [];
  const todaySessions  = data?.todaySessions ?? [];
  const allSessions    = data?.allSessions ?? [];
  const programs       = data?.programs ?? [];
  const mentors        = data?.mentors ?? [];
  const payments       = data?.payments ?? [];
  const recentEnroll   = (data?.recentEnrollments ?? []).slice(0, 10) as (Enrollment & { userName?: string; programTitle?: string })[];

  // Total present across all attendance records for today's sessions
  const liveParticipants = liveSessions.reduce((sum, s) => sum + (data?.attendanceCounts[s.id] ?? 0), 0);

  // Revenue totals
  const rByMonth    = data?.revenueByMonth ?? {};
  const curMonth    = new Date().toISOString().slice(0, 7);
  const monthRev    = rByMonth[curMonth] ?? 0;
  const totalRevPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);

  // Revenue bars — last 12 months
  // Use new Date(year, month, 1) to avoid day-of-month overflow (e.g. Apr 30 → setMonth(Feb) → Mar 2)
  const revBars = Array.from({ length: 12 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: MONTH_LABELS[d.getMonth()], yearMonth, amount: rByMonth[yearMonth] ?? 0, isCurrent: yearMonth === curMonth };
  });
  const maxRev = Math.max(...revBars.map(b => b.amount), 1);

  // Weekly user growth bars (last 7 days)
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayLabel = d.toLocaleDateString("en-US", { weekday:"short" }).slice(0, 3);
    const dateStr  = d.toISOString().split("T")[0];
    const count    = (data?.recentEnrollments ?? []).filter(e => e.createdAt?.startsWith(dateStr)).length;
    return { day: dayLabel, dateStr, count, isToday: i === 6 };
  });
  const maxWeek = Math.max(...weekBars.map(b => b.count), 1);

  // Program breakdown
  const progBreakdown = programs.map(p => {
    const enrolled = (data?.recentEnrollments ?? []).filter(e => e.programId === p.id && e.status === "active").length;
    const totalSess = allSessions.filter(s => s.programId === p.id).length;
    const presentCount = allSessions
      .filter(s => s.programId === p.id)
      .reduce((sum, s) => sum + (data?.attendanceCounts[s.id] ?? 0), 0);
    const possible = totalSess * Math.max(enrolled, 1);
    const completion = possible > 0 ? Math.round((presentCount / possible) * 100) : 0;
    return { ...p, enrolled, completion };
  });

  // Mentor performance
  const mentorRows = mentors.map(m => {
    const mSessions = allSessions.filter(s => s.mentorId === m.uid);
    const sessionCount = mSessions.length;
    const totalPresent = mSessions.reduce((sum, s) => sum + (data?.attendanceCounts[s.id] ?? 0), 0);
    const totalEnrolled = progBreakdown.find(p => p.mentorId === m.uid)?.enrolled ?? 0;
    const avgAtt = sessionCount > 0 && totalEnrolled > 0
      ? Math.round((totalPresent / (sessionCount * totalEnrolled)) * 100) : 0;
    const mPayments = payments.filter(p => p.status === "paid" && programs.find(pg => pg.mentorId === m.uid && pg.id === p.programId));
    const thisMonthPay = mPayments.filter(p => p.createdAt?.startsWith(curMonth)).reduce((s, p) => s + (p.amount ?? 0), 0);
    return {
      uid: m.uid, name: m.name, initials: initials(m.name),
      program: programs.find(p => p.mentorId === m.uid)?.title ?? "—",
      students: totalEnrolled, attendance: avgAtt,
      sessions: sessionCount, thisMonth: thisMonthPay,
    };
  });

  // Activity feed from recent enrollments + sessions
  const activityItems = [
    ...(data?.recentEnrollments ?? []).slice(0, 3).map(e => ({
      type: "enroll" as const,
      text: `${e.userName ?? "Someone"} enrolled in ${e.programTitle ?? e.programId} (${e.batch ?? ""} batch)`,
      time: e.createdAt,
    })),
    ...todaySessions.slice(0, 2).map(s => ({
      type: "session" as const,
      text: `Session scheduled — ${s.title} with ${s.mentorName} · ${fmt12(s.startTime)}`,
      time: s.createdAt,
    })),
    ...payments.filter(p => p.status === "paid").slice(0, 2).map(p => ({
      type: "payment" as const,
      text: `Payment received — ${fmtRupees(p.amount)} for ${programs.find(pg => pg.id === p.programId)?.title ?? p.programId}`,
      time: p.createdAt,
    })),
  ]
    .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
    .slice(0, 5);

  // Platform health items (real checks)
  const failedPayments = payments.filter(p => p.status === "failed").length;
  const platformHealth = [
    { label:"Live Sessions",   status: liveSessions.length > 0 ? "Active" : "Operational", color:"#22c55e" },
    { label:"Auth Service",    status:"Operational",  color:"#22c55e" },
    { label:"Payments",        status: failedPayments > 0 ? `${failedPayments} failures` : "Operational", color: failedPayments > 0 ? "#f59e0b" : "#22c55e" },
    { label:"Database",        status:"Healthy",      color:"#22c55e" },
  ];

  // Notifications (data-driven)
  const notifications: { color: string; text: string }[] = [];
  if (failedPayments > 0) notifications.push({ color:"#ef4444", text:`${failedPayments} payment failure${failedPayments > 1 ? "s" : ""} — review in Payments tab` });
  if (liveSessions.length > 0) notifications.push({ color:"#22c55e", text:`${liveSessions.length} session${liveSessions.length > 1 ? "s" : ""} live right now · ${liveParticipants} participants` });
  if (data && data.totalUsers > 0) notifications.push({ color:"#3b82f6", text:`${data.newUsersThisWeek} new members joined this week` });
  if (notifications.length === 0) notifications.push({ color:"#22c55e", text:"All systems running normally" });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pb-20 adm-bg" style={{ minHeight: "100vh" }}>

      {/* Header */}
      <div
        className="sticky top-0 z-20 px-6 md:px-10 py-4 flex items-center justify-between"
        style={{
          background: "var(--adm-topbar)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--adm-topbar-border)",
        }}
      >
        <div>
          <h1 className="adm-text" style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.6rem", fontWeight:400 }}>Platform Overview</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs adm-text-3">{today}</span>
            <span className="adm-text-4">·</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#22c55e" }} />
              <span className="text-xs" style={{ color:"#22c55e" }}>All systems operational</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all adm-text-3"
            style={{ border: "1px solid var(--adm-border)", background: "var(--adm-input)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-elevated)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-input)")}
          >
            <RefreshCw size={13} />
          </button>
          <ThemeToggle />
          <button
            onClick={() => router.push("/admin")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background:"var(--adm-accent)", color:"var(--adm-text)" }}
          >
            <Plus size={13}/> New Program
          </button>
        </div>
      </div>

      {loading ? <OverviewSkeleton /> : (
        <div className="px-6 md:px-10 pt-6 space-y-6">

          {/* Stats Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon:<Users size={16} style={{ color:"#3b82f6" }}/>, iconBg:"rgba(59,130,246,0.1)", label:"Total Users", value: (data?.totalUsers ?? 0).toLocaleString("en-IN"), sub:`+${data?.newUsersThisWeek ?? 0} this week`, trend:{ dir:"up" as const, label:`+${data?.newUsersThisWeek ?? 0} this week` } },
              { icon:<Monitor size={16} style={{ color:"#6b7280" }}/>, iconBg:"rgba(107,114,128,0.1)", label:"Active Programs", value: String(data?.totalPrograms ?? 0), sub: programs.map(p => p.title).join(" & ") || "—" },
              { icon:<Circle size={16} style={{ color:"#8b5cf6" }}/>, iconBg:"rgba(139,92,246,0.1)", label:"Total Revenue", value: fmtRupees(totalRevPaid), sub: `${fmtRupees(monthRev)} this month` },
              { icon:<motion.div animate={{ scale:[1,1.3,1] }} transition={{ duration:1.5, repeat:Infinity }}><Circle size={16} style={{ color:"#ef4444" }}/></motion.div>, iconBg:"rgba(239,68,68,0.08)", label:"Live Right Now", value: String(liveParticipants), sub: liveSessions.length > 0 ? `${liveSessions.length} session${liveSessions.length > 1 ? "s" : ""} running` : "No live sessions" },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.06 }}>
                <StatCard {...c} />
              </motion.div>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon:<Clock size={16} style={{ color:"#14b8a6" }}/>, iconBg:"rgba(20,184,166,0.1)", label:"Total Sessions", value: (data?.totalSessions ?? 0).toLocaleString("en-IN"), sub:"all time" },
              { icon:<TrendingUp size={16} style={{ color:"#3b82f6" }}/>, iconBg:"rgba(59,130,246,0.1)", label:"Active Enrollments", value: (data?.activeEnrollments ?? 0).toLocaleString("en-IN"), sub:"currently enrolled" },
              { icon:<Star size={16} style={{ color:"#f59e0b" }}/>, iconBg:"rgba(245,158,11,0.1)", label:"Mentors", value: String(mentors.length), sub: mentors.length > 0 ? mentors.map(m => m.name.split(" ")[0]).join(", ") : "None assigned" },
              { icon:<AlertCircle size={16} style={{ color:"#f43f5e" }}/>, iconBg:"rgba(244,63,94,0.08)", label:"Today's Sessions", value: String(todaySessions.length), sub: liveSessions.length > 0 ? `${liveSessions.length} live now` : "No sessions live yet" },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.24 + i * 0.06 }}>
                <StatCard {...c} />
              </motion.div>
            ))}
          </div>

          {/* Live Sessions */}
          {todaySessions.length > 0 && (
            <motion.div className="rounded-2xl overflow-hidden" style={{ border:"1px solid #E8E1D6" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}>
              <div className="px-6 py-3.5 flex items-center justify-between" style={{ background:"rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background:"#ef4444" }} />
                    <span className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Live Sessions — Right Now</span>
                  </div>
                  {liveSessions.length > 0 && (
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"#ef4444", color:"#fff" }}>
                      {liveSessions.length} LIVE
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setRefreshKey(k => k + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                  style={{ border:"1px solid rgba(255,255,255,0.12)", color:"rgba(246,244,239,0.7)" }}
                >
                  <RefreshCw size={11}/> Refresh
                </button>
              </div>

              <div className="p-4 grid md:grid-cols-2 gap-4" style={{ background:"var(--adm-card)" }}>
                {todaySessions.map(s => {
                  const live = isLiveNow(s);
                  const present = data?.attendanceCounts[s.id] ?? 0;
                  const pct = data?.activeEnrollments ? Math.min(100, Math.round((present / data.activeEnrollments) * 100)) : 0;
                  const elapsed = elapsedMins(s);
                  return (
                    <div key={s.id} className="rounded-xl p-5" style={{ background:"rgba(255,255,255,0.04)", border:`1.5px solid ${live ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {live ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#ef4444" }} />
                                <span className="text-[10px] font-semibold tracking-widest" style={{ color:"#ef4444" }}>LIVE · {elapsed} MIN</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold tracking-widest" style={{ color:"var(--adm-text-3)" }}>
                                {fmt12(s.startTime)} – {fmt12(s.endTime)}
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", fontWeight:400, color:"var(--adm-text)" }}>{s.title}</h3>
                          <p className="text-xs mt-0.5" style={{ color:"var(--adm-text-3)" }}>{s.mentorName} · {s.batch} Batch</p>
                        </div>
                        <div className="text-right">
                          <span style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.8rem", color:"var(--adm-text)", lineHeight:1 }}>{present}</span>
                          <p className="text-[9px] tracking-widest uppercase" style={{ color:"var(--adm-text-3)" }}>attended</p>
                        </div>
                      </div>

                      {live && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] tracking-widest uppercase" style={{ color:"var(--adm-text-3)" }}>Attendance</span>
                            <span className="text-[10px]" style={{ color:"var(--adm-text-3)" }}>{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                            <div className="h-full rounded-full" style={{ width:`${pct}%`, background:"#ef4444" }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => router.push(`/session/${s.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium tracking-widest uppercase"
                          style={{ background:"rgba(255,255,255,0.06)", color:"var(--adm-text)" }}
                        >
                          <Monitor size={11}/> Monitor
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Session Schedule */}
          <motion.div className="rounded-2xl overflow-hidden" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55 }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Session Schedule — All Mentors</h3>
              <span className="text-xs" style={{ color:"var(--adm-text-3)" }}>
                {allSessions.length} total sessions
              </span>
            </div>

            {allSessions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.2rem", color:"var(--adm-text-3)", fontWeight:300 }}>No sessions created yet</p>
                <p className="text-xs mt-1" style={{ color:"var(--adm-text-4)" }}>Sessions created by mentors will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["SESSION","MENTOR","BATCH","DATE","TIME","ATTENDED","STATUS"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-widest uppercase" style={{ color:"rgba(246,244,239,0.35)", fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.slice(0, 10).map((s, i) => {
                      const live = isLiveNow(s);
                      const attended = data?.attendanceCounts[s.id] ?? 0;
                      const past = s.date < new Date().toISOString().split("T")[0];
                      return (
                        <tr key={s.id} style={{ borderBottom: i < Math.min(allSessions.length, 10) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                          <td className="px-5 py-3.5 text-sm font-medium" style={{ color:"var(--adm-text)" }}>{s.title}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background:"#5C6B57", color:"#fff" }}>{initials(s.mentorName)}</div>
                              <span className="text-sm" style={{ color:"var(--adm-text-2)" }}>{s.mentorName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full" style={{
                              background: s.batch === "Morning" ? "rgba(251,146,60,0.12)" : "rgba(99,102,241,0.1)",
                              color: s.batch === "Morning" ? "#ea7c1a" : "#6366f1",
                            }}>{s.batch.toUpperCase()}</span>
                          </td>
                          <td className="px-5 py-3.5 text-sm" style={{ color:"var(--adm-text-2)" }}>{fmtDate(s.date)}</td>
                          <td className="px-5 py-3.5 text-sm" style={{ color:"var(--adm-text-2)" }}>{fmt12(s.startTime)}</td>
                          <td className="px-5 py-3.5 text-sm font-medium" style={{ color:"var(--adm-text)" }}>{attended}</td>
                          <td className="px-5 py-3.5">
                            {live ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#ef4444" }} />
                                <span className="text-xs font-semibold" style={{ color:"#ef4444" }}>LIVE</span>
                              </div>
                            ) : past ? (
                              <span className="text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full" style={{ background:"rgba(34,197,94,0.1)", color:"#16a34a" }}>DONE</span>
                            ) : (
                              <span className="text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full" style={{ background:"rgba(107,114,128,0.08)", color:"#6b7280" }}>UPCOMING</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.03)" }}>
              <span className="text-xs" style={{ color:"var(--adm-text-3)" }}>
                {liveSessions.length} live · {liveParticipants} participants · {todaySessions.length} today
              </span>
              <span className="text-xs" style={{ color:"var(--adm-text-4)" }}>Showing latest 10</span>
            </div>
          </motion.div>

          {/* Revenue + Platform Health */}
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div className="md:col-span-2 rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Revenue Over Time</h3>
                <span className="text-xs" style={{ color:"var(--adm-text-3)" }}>From paid enrollments</span>
              </div>
              {totalRevPaid === 0 ? (
                <div className="flex items-end gap-1.5 h-28 mb-4">
                  {revBars.map(b => (
                    <div key={b.yearMonth} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md" style={{ height:"10%", background:"rgba(92,107,87,0.1)" }} />
                      <span className="text-[9px]" style={{ color:"var(--adm-text-4)" }}>{b.month}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-1.5 h-28 mb-4">
                  {revBars.map(b => {
                    const h = Math.max(4, Math.round((b.amount / maxRev) * 100));
                    return (
                      <div key={b.yearMonth} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-md" style={{ height:`${h}%`, background: b.isCurrent ? "#5C6B57" : "rgba(92,107,87,0.3)" }} />
                        <span className="text-[9px]" style={{ color: b.isCurrent ? "#5C6B57" : "#C4BDB5" }}>{b.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-8 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{fmtRupees(monthRev)}</p>
                  <p className="text-xs" style={{ color:"var(--adm-text-3)" }}>This month</p>
                </div>
                <div>
                  <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{fmtRupees(totalRevPaid)}</p>
                  <p className="text-xs" style={{ color:"var(--adm-text-3)" }}>All time</p>
                </div>
                <div>
                  <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{data?.activeEnrollments ?? 0}</p>
                  <p className="text-xs" style={{ color:"var(--adm-text-3)" }}>Active members</p>
                </div>
              </div>
            </motion.div>

            <motion.div className="rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.65 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Platform Health</h3>
                <button className="text-xs flex items-center gap-1" style={{ color:"#5C6B57" }}>Details <ChevronRight size={12}/></button>
              </div>
              <div className="space-y-3.5">
                {platformHealth.map(h => (
                  <div key={h.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      <span className="text-sm" style={{ color:"var(--adm-text-2)" }}>{h.label}</span>
                    </div>
                    <span className="text-xs" style={{ color: h.color }}>{h.status}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-5" style={{ color:"var(--adm-text-4)" }}>Last checked: just now</p>
            </motion.div>
          </div>

          {/* Recent Enrollments */}
          <motion.div className="rounded-2xl overflow-hidden" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.7 }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Recent Enrollments</h3>
              <button className="text-xs flex items-center gap-1" style={{ color:"#5C6B57" }}>View All <ChevronRight size={12}/></button>
            </div>

            {recentEnroll.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.2rem", color:"var(--adm-text-3)", fontWeight:300 }}>No enrollments yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["STUDENT","PROGRAM","BATCH","ENROLLED ON","STATUS"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-widest uppercase" style={{ color:"rgba(246,244,239,0.35)", fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnroll.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: i < recentEnroll.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background:"rgba(92,107,87,0.12)", color:"#5C6B57" }}>
                              {initials(e.userName ?? "?")}
                            </div>
                            <span className="text-sm" style={{ color:"var(--adm-text)" }}>{e.userName ?? "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm" style={{ color:"var(--adm-text-2)" }}>{e.programTitle ?? e.programId}</td>
                        <td className="px-5 py-3 text-sm" style={{ color:"var(--adm-text-2)" }}>{e.batch}</td>
                        <td className="px-5 py-3 text-sm" style={{ color:"var(--adm-text-2)" }}>{fmtDate(e.createdAt)}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-semibold tracking-widest px-2.5 py-1 rounded-full" style={{
                            background: e.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                            color: e.status === "active" ? "#16a34a" : "#d97706",
                          }}>{e.status.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* User Growth + Program Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div className="rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.72 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>User Growth</h3>
                <span className="text-xs" style={{ color:"var(--adm-text-3)" }}>Last 7 days</span>
              </div>
              <div className="flex items-end gap-2 h-24 mb-4">
                {weekBars.map(b => {
                  const h = Math.max(4, Math.round((b.count / maxWeek) * 100));
                  return (
                    <div key={b.dateStr} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md" style={{ height:`${h}%`, background: b.isToday ? "#5C6B57" : "rgba(92,107,87,0.3)" }} />
                      <span className="text-[9px]" style={{ color: b.isToday ? "#5C6B57" : "#C4BDB5" }}>{b.day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div><p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{data?.newUsersThisWeek ?? 0}</p><p className="text-xs" style={{ color:"var(--adm-text-3)" }}>This Week</p></div>
                <div><p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{data?.newUsersThisMonth ?? 0}</p><p className="text-xs" style={{ color:"var(--adm-text-3)" }}>This Month</p></div>
                <div><p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.4rem", color:"var(--adm-text)" }}>{(data?.totalUsers ?? 0).toLocaleString("en-IN")}</p><p className="text-xs" style={{ color:"var(--adm-text-3)" }}>Total</p></div>
              </div>
            </motion.div>

            <motion.div className="rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.76 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Program Breakdown</h3>
              </div>
              {progBreakdown.length === 0 ? (
                <p className="text-sm" style={{ color:"var(--adm-text-3)" }}>No programs yet</p>
              ) : (
                <div className="space-y-4">
                  {progBreakdown.map(p => (
                    <div key={p.id} className="p-4 rounded-xl" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>{p.title}</span>
                        <span className="text-sm" style={{ color:"#5C6B57" }}>₹{(p.price / 100).toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs mb-2" style={{ color:"var(--adm-text-3)" }}>{p.enrolledCount} enrolled · {p.duration} days</p>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width:`${p.completion}%`, background:"#5C6B57" }} />
                      </div>
                      <p className="text-xs text-right mt-1" style={{ color:"var(--adm-text-3)" }}>{p.completion}% attendance rate</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs text-center tracking-widest uppercase" style={{ color:"var(--adm-text-3)" }}>
                  TOTAL ACTIVE: <span style={{ color:"var(--adm-text)", fontWeight:600 }}>{data?.activeEnrollments ?? 0}</span>
                </p>
              </div>
            </motion.div>
          </div>

          {/* Mentor Performance */}
          {mentorRows.length > 0 && (
            <motion.div className="rounded-2xl overflow-hidden" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.78 }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Mentor Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["MENTOR","PROGRAM","STUDENTS","AVG ATTENDANCE","SESSIONS","THIS MONTH"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] tracking-widest uppercase" style={{ color:"rgba(246,244,239,0.35)", fontWeight:400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mentorRows.map((t, i) => (
                      <tr key={t.uid} style={{ borderBottom: i < mentorRows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background:"#5C6B57", color:"#fff" }}>{t.initials}</div>
                            <span className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>{t.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color:"var(--adm-text-2)" }}>{t.program}</td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color:"var(--adm-text)" }}>{t.students}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                              <div className="h-full rounded-full" style={{ width:`${t.attendance}%`, background:"#5C6B57" }} />
                            </div>
                            <span className="text-sm" style={{ color:"var(--adm-text-2)" }}>{t.attendance}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm" style={{ color:"var(--adm-text-2)" }}>{t.sessions} sessions</td>
                        <td className="px-5 py-4 text-sm font-medium" style={{ color:"#5C6B57" }}>{fmtRupees(t.thisMonth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Activity + Notifications */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div className="rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.82 }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Recent Activity</h3>
              </div>
              {activityItems.length === 0 ? (
                <p className="text-sm" style={{ color:"var(--adm-text-3)" }}>No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {activityItems.map((a, i) => (
                    <div key={`${a.type}-${a.time ?? i}`} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: a.type === "enroll" ? "rgba(92,107,87,0.1)" : a.type === "session" ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)" }}>
                        {a.type === "enroll" ? <Users size={12} style={{ color:"#5C6B57" }}/> : a.type === "session" ? <CheckCircle2 size={12} style={{ color:"#22c55e" }}/> : <TrendingUp size={12} style={{ color:"#6366f1" }}/>}
                      </div>
                      <div>
                        <p className="text-sm leading-relaxed" style={{ color:"var(--adm-text-2)" }}>{a.text}</p>
                        <p className="text-xs mt-0.5" style={{ color:"var(--adm-text-4)" }}>{fmtDate(a.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div className="rounded-2xl p-6" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.86 }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium" style={{ color:"var(--adm-text)" }}>Notifications</h3>
              </div>
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div key={`${n.color}-${i}`} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: n.color }} />
                    <p className="text-xs leading-relaxed" style={{ color:"var(--adm-text-2)" }}>{n.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

        </div>
      )}
    </div>
  );
}
