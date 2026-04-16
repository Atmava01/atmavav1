"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSessionsByMentor,
  getMentorAssignmentSnapshot,
  getAttendanceForSession,
  upsertAttendance,
} from "@/lib/firestore";
import type { Session, Program, Enrollment, UserProfile, Attendance } from "@/types";

type StudentRow = { enrollment: Enrollment; userProfile: UserProfile };

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function pct(present: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((present / total) * 100)}%`;
}

export function MentorAttendance() {
  const { user, userProfile } = useAuth();

  const [program, setProgram]   = useState<Program | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(true);

  // Attendance keyed by sessionId → Attendance[]
  const [records, setRecords] = useState<Record<string, Attendance[]>>({});
  // Which session rows are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Edit draft keyed by sessionId → { userId → present }
  const [drafts, setDrafts] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({});

  // Filter
  const [batchFilter, setBatchFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const [assignment, allSessions] = await Promise.all([
          getMentorAssignmentSnapshot(token),
          getSessionsByMentor(user!.uid),
        ]);
        if (cancelled) return;
        const myProgram = assignment.program;
        setProgram(myProgram);
        setStudents(assignment.students);

        const past = allSessions
          .filter(s => s.date <= new Date().toISOString().split("T")[0])
          .sort((a, b) => b.date.localeCompare(a.date));
        setSessions(past);

        // Load attendance for all past sessions in parallel
        const attendanceMap: Record<string, Attendance[]> = {};
        await Promise.all(
          past.map(async s => {
            attendanceMap[s.id] = await getAttendanceForSession(s.id);
          })
        );
        if (!cancelled) setRecords(attendanceMap);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid, userProfile?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else {
        next.add(id);
        // Build draft from existing records
        const sessionStudents = sessions.find(s => s.id === id);
        const batch = sessionStudents?.batch ?? "";
        const batchStudents = batch
          ? students.filter(r => r.enrollment.batch === batch)
          : students;
        const draft: Record<string, boolean> = {};
        batchStudents.forEach(r => {
          const rec = (records[id] ?? []).find(a => a.userId === r.userProfile.uid);
          draft[r.userProfile.uid] = rec?.present ?? false;
        });
        setDrafts(prev2 => ({ ...prev2, [id]: draft }));
      }
      return next;
    });
  };

  const saveAttendance = async (s: Session) => {
    if (!program) return;
    setSaving(s.id);
    const draft = drafts[s.id] ?? {};
    const batchStudents = s.batch
      ? students.filter(r => r.enrollment.batch === s.batch)
      : students;
    try {
      await Promise.all(
        batchStudents.map(r =>
          upsertAttendance({
            sessionId: s.id,
            programId: program.id,
            userId:    r.userProfile.uid,
            userName:  r.userProfile.name,
            present:   draft[r.userProfile.uid] ?? false,
            date:      s.date,
          })
        )
      );
      // Refresh records for this session
      const updated = await getAttendanceForSession(s.id);
      setRecords(prev => ({ ...prev, [s.id]: updated }));
      setSaveMsg(prev => ({ ...prev, [s.id]: "Saved ✓" }));
      setTimeout(() => setSaveMsg(prev => ({ ...prev, [s.id]: "" })), 3000);
    } catch {
      setSaveMsg(prev => ({ ...prev, [s.id]: "Failed — try again" }));
    } finally {
      setSaving(null);
    }
  };

  // ── Derived: student-level daily summary ─────────────────────────────────────
  const allBatches = Array.from(new Set(students.map(r => r.enrollment.batch).filter(Boolean)));
  const filteredStudents = batchFilter === "all"
    ? students
    : students.filter(r => r.enrollment.batch === batchFilter);

  // ── Session-level stats ────────────────────────────────────────────────────────
  const sessionStats = sessions.map(s => {
    const batchStudents = s.batch
      ? students.filter(r => r.enrollment.batch === s.batch)
      : students;
    const sessionRecords = records[s.id] ?? [];
    const present = sessionRecords.filter(a => a.present).length;
    const total   = batchStudents.length;
    return { session: s, present, total };
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF" }}>
          Attendance
        </h1>
        <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.35)" }}>
          {program?.title ?? "Program"} · {sessions.length} sessions recorded
        </p>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Sessions",
              value: sessions.length,
              sub: "recorded",
            },
            {
              label: "Total Students",
              value: students.length,
              sub: "enrolled",
            },
            {
              label: "Avg Attendance",
              value: (() => {
                const totals = sessionStats.map(s => s.total > 0 ? s.present / s.total : null).filter(v => v !== null) as number[];
                if (!totals.length) return "—";
                return `${Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100)}%`;
              })(),
              sub: "per session",
            },
            {
              label: "Last Session",
              value: sessions[0] ? formatDate(sessions[0].date) : "—",
              sub: sessions[0]?.title ?? "",
            },
          ].map(card => (
            <div key={card.label} className="rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.35)" }}>
                {card.label}
              </p>
              <p className="text-xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF" }}>
                {card.value}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(246,244,239,0.3)" }}>{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Per-session attendance ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
            Session Records
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Calendar size={28} style={{ color: "rgba(246,244,239,0.2)", margin: "0 auto 12px" }} />
            <p className="text-sm font-light" style={{ color: "rgba(246,244,239,0.4)", fontFamily: "'Cormorant Garamond', serif" }}>
              No sessions yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessionStats.map(({ session: s, present, total }) => {
              const isExpanded = expanded.has(s.id);
              const draft = drafts[s.id] ?? {};
              const batchStudents = s.batch
                ? students.filter(r => r.enrollment.batch === s.batch)
                : students;
              const rate = total > 0 ? Math.round((present / total) * 100) : 0;

              return (
                <motion.div key={s.id} className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>

                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3 text-left"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    onClick={() => toggleExpand(s.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{s.title}</p>
                        {s.batch && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.45)" }}>
                            {s.batch}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>
                        {formatDate(s.date)} · {s.startTime}–{s.endTime}
                      </p>
                    </div>

                    {/* Attendance bar */}
                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: rate >= 75 ? "#7A8C74" : rate >= 50 ? "#D4A847" : "#ef4444" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right" style={{ color: "rgba(246,244,239,0.55)" }}>
                        {present}/{total}
                      </span>
                      <span className="text-xs font-medium w-8 text-right" style={{
                        color: rate >= 75 ? "#7A8C74" : rate >= 50 ? "#D4A847" : "#ef4444"
                      }}>
                        {pct(present, total)}
                      </span>
                    </div>

                    {/* Mobile stats */}
                    <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
                      <span className="text-xs" style={{ color: "rgba(246,244,239,0.5)" }}>{present}/{total}</span>
                    </div>

                    {isExpanded
                      ? <ChevronUp size={14} style={{ color: "rgba(246,244,239,0.3)", flexShrink: 0 }} />
                      : <ChevronDown size={14} style={{ color: "rgba(246,244,239,0.3)", flexShrink: 0 }} />}
                  </button>

                  {/* Expanded: student list */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="p-4 space-y-2" style={{ background: "rgba(122,140,116,0.04)" }}>
                          {batchStudents.length === 0 ? (
                            <p className="text-xs" style={{ color: "rgba(246,244,239,0.35)" }}>No students in this batch.</p>
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                {batchStudents.map(row => {
                                  const isPresent = draft[row.userProfile.uid] ?? false;
                                  return (
                                    <div key={row.userProfile.uid}
                                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                                      style={{ background: "rgba(255,255,255,0.04)" }}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isPresent
                                          ? <CheckCircle2 size={13} style={{ color: "#7A8C74", flexShrink: 0 }} />
                                          : <XCircle size={13} style={{ color: "rgba(246,244,239,0.2)", flexShrink: 0 }} />}
                                        <p className="text-sm truncate" style={{ color: isPresent ? "#F6F4EF" : "rgba(246,244,239,0.45)" }}>
                                          {row.userProfile.name}
                                        </p>
                                      </div>
                                      <div className="flex gap-1.5">
                                        {["Present", "Absent"].map(label => (
                                          <motion.button key={label}
                                            onClick={() => setDrafts(prev => ({
                                              ...prev,
                                              [s.id]: { ...prev[s.id], [row.userProfile.uid]: label === "Present" },
                                            }))}
                                            className="px-2.5 py-1 rounded-lg text-xs"
                                            animate={{
                                              background: isPresent === (label === "Present")
                                                ? (label === "Present" ? "rgba(122,140,116,0.3)" : "rgba(192,64,64,0.2)")
                                                : "rgba(255,255,255,0.05)",
                                              color: isPresent === (label === "Present")
                                                ? (label === "Present" ? "#7A8C74" : "#c04040")
                                                : "rgba(246,244,239,0.35)",
                                            }}
                                            whileHover={{ opacity: 0.8 }} whileTap={{ scale: 0.95 }}>
                                            {label}
                                          </motion.button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-3 pt-2">
                                <motion.button
                                  onClick={() => saveAttendance(s)}
                                  disabled={saving === s.id}
                                  className="px-4 py-2 rounded-xl text-xs tracking-widest uppercase"
                                  style={{ background: "#7A8C74", color: "#F6F4EF", minHeight: "34px" }}
                                  whileHover={{ background: "#6a7c64" }} whileTap={{ scale: 0.97 }}>
                                  {saving === s.id ? "Saving…" : "Save"}
                                </motion.button>
                                {saveMsg[s.id] && (
                                  <p className="text-xs" style={{ color: saveMsg[s.id].includes("✓") ? "#7A8C74" : "#c04040" }}>
                                    {saveMsg[s.id]}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Daily attendance grid (per student) ────────────────────────────────── */}
      {sessions.length > 0 && students.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
              Student Daily View
            </p>
            {/* Batch filter */}
            {allBatches.length > 1 && (
              <div className="flex gap-1.5">
                {["all", ...allBatches].map(b => (
                  <motion.button key={b}
                    onClick={() => setBatchFilter(b)}
                    className="px-3 py-1 rounded-lg text-xs"
                    animate={{
                      background: batchFilter === b ? "rgba(122,140,116,0.25)" : "rgba(255,255,255,0.05)",
                      color: batchFilter === b ? "#7A8C74" : "rgba(246,244,239,0.45)",
                    }}
                    whileTap={{ scale: 0.95 }}>
                    {b === "all" ? "All batches" : b}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {/* Header row: sessions */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ minWidth: `${Math.max(400, 160 + sessions.length * 56)}px` }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <th className="text-left px-4 py-2.5 sticky left-0 z-10"
                      style={{ color: "rgba(246,244,239,0.4)", background: "rgba(20,19,17,0.95)", minWidth: 160, fontWeight: 500 }}>
                      Student
                    </th>
                    {sessions.map(s => (
                      <th key={s.id} className="px-2 py-2.5 text-center" style={{ color: "rgba(246,244,239,0.35)", fontWeight: 400, minWidth: 56 }}>
                        <div>{new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                        {s.batch && <div style={{ color: "rgba(246,244,239,0.2)", fontSize: "9px" }}>{s.batch}</div>}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center" style={{ color: "rgba(246,244,239,0.4)", fontWeight: 500, minWidth: 60 }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((row, ri) => {
                    const uid = row.userProfile.uid;
                    let studentPresent = 0;
                    let studentTotal   = 0;

                    return (
                      <tr key={uid} style={{ borderBottom: ri < filteredStudents.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        {/* Name */}
                        <td className="px-4 py-2.5 sticky left-0 z-10"
                          style={{ background: "rgba(18,17,14,0.98)", color: "#F6F4EF" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0"
                              style={{ background: "#5C6B57", color: "#F6F4EF" }}>
                              {row.userProfile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[120px]">{row.userProfile.name}</span>
                          </div>
                        </td>
                        {/* Per-session cells */}
                        {sessions.map(s => {
                          const relevant = !s.batch || s.batch === row.enrollment.batch;
                          if (!relevant) {
                            return (
                              <td key={s.id} className="text-center px-2 py-2.5">
                                <span style={{ color: "rgba(246,244,239,0.12)", fontSize: 12 }}>–</span>
                              </td>
                            );
                          }
                          const rec = (records[s.id] ?? []).find(a => a.userId === uid);
                          const present = rec?.present ?? null;
                          if (present === true)  { studentPresent++; studentTotal++; }
                          if (present === false) { studentTotal++; }
                          return (
                            <td key={s.id} className="text-center px-2 py-2.5">
                              {present === true  && <CheckCircle2 size={13} style={{ color: "#7A8C74", margin: "0 auto" }} />}
                              {present === false && <XCircle      size={13} style={{ color: "rgba(192,64,64,0.6)", margin: "0 auto" }} />}
                              {present === null  && <span style={{ color: "rgba(246,244,239,0.2)", fontSize: 11 }}>?</span>}
                            </td>
                          );
                        })}
                        {/* Total */}
                        <td className="text-center px-3 py-2.5">
                          <span className="font-medium" style={{
                            color: studentTotal === 0 ? "rgba(246,244,239,0.25)"
                              : studentPresent / studentTotal >= 0.75 ? "#7A8C74"
                              : studentPresent / studentTotal >= 0.5  ? "#D4A847"
                              : "#ef4444",
                          }}>
                            {studentTotal === 0 ? "—" : `${studentPresent}/${studentTotal}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 px-1">
            {[
              { icon: <CheckCircle2 size={11} style={{ color: "#7A8C74" }} />, label: "Present" },
              { icon: <XCircle size={11} style={{ color: "rgba(192,64,64,0.6)" }} />, label: "Absent" },
              { icon: <span style={{ color: "rgba(246,244,239,0.2)", fontSize: 11 }}>?</span>, label: "Not recorded" },
              { icon: <span style={{ color: "rgba(246,244,239,0.15)", fontSize: 11 }}>–</span>, label: "Different batch" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                {item.icon}
                <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
