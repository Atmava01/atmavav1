"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Copy, ExternalLink, Calendar, Users, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildSessionMeetLink, openSessionLaunch } from "@/lib/sessionLinks";
import {
  getSessionsByMentor,
  getMentorAssignmentSnapshot,
  getAttendanceForSession,
  upsertAttendance,
  subscribeSessionPresence,
} from "@/lib/firestore";
import type { Session, Program, Enrollment, UserProfile } from "@/types";

type Tab = "upcoming" | "past";
type StudentRow = { enrollment: Enrollment; userProfile: UserProfile };

const EMPTY_FORM = {
  title: "",
  programId: "",
  batch: "",
  date: new Date().toISOString().split("T")[0],
  startTime: "06:30",
  endTime: "07:30",
  meetLink: "",
};

function addMinutes(base: Date, mins: number): string {
  const d = new Date(base.getTime() + mins * 60000);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// Extract batch start time from program batches (e.g. "6:30 AM" → "06:30")
function parseBatchTime(batchTime: string): string | null {
  const m = batchTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${min}`;
}

export function MentorSessions() {
  const { user, userProfile } = useAuth();

  const [sessions, setSessions]     = useState<Session[]>([]);
  const [program, setProgram]       = useState<Program | null>(null);
  const [students, setStudents]     = useState<StudentRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("upcoming");
  const [creating, setCreating]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  // Attendance state: keyed by sessionId
  const [attendanceOpen, setAttendanceOpen] = useState<string | null>(null);
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, boolean>>({}); // userId → present
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);
  // Live presence subscription (for today's sessions)
  const [livePresence, setLivePresence] = useState<Set<string>>(new Set()); // userId → online now
  const presenceUnsubRef = useRef<(() => void) | null>(null);

  // Quick-start state
  const [quickStartConfirm, setQuickStartConfirm] = useState(false);
  const [quickStarting, setQuickStarting] = useState(false);
  const [quickStartError, setQuickStartError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const [allSessions, assignment] = await Promise.all([
          getSessionsByMentor(user!.uid),
          getMentorAssignmentSnapshot(token),
        ]);
        if (cancelled) return;

        setSessions(allSessions.sort((a, z) => a.date.localeCompare(z.date)));
        const myProgram = assignment.program;
        setProgram(myProgram);
        setStudents(assignment.students);

        if (myProgram) {
          // Pre-fill form programId and first batch
          setForm(f => ({
            ...f,
            programId: myProgram.id,
            batch: myProgram.batches[0]?.name ?? "",
          }));
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      presenceUnsubRef.current?.();
      presenceUnsubRef.current = null;
    };
  }, [user, userProfile?.name]);

  const upcoming  = sessions.filter(s => s.date >= today);
  const past      = sessions.filter(s => s.date <  today);
  const displayed = tab === "upcoming" ? upcoming : past;

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const programId = program?.id ?? form.programId;
    if (!user || !form.title || !form.date || !programId) {
      setFormError("Please fill in title, date, and assigned program.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          programId,
          batch: form.batch,
          title: form.title,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create session");
      const { sessionId, meetLink } = await res.json();
      const newSess: Session = {
        id: sessionId,
        programId,
        batch: form.batch,
        mentorId: user.uid,
        mentorName: userProfile?.name ?? "Mentor",
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        meetLink: meetLink ?? buildSessionMeetLink(sessionId),
        createdAt: new Date().toISOString(),
      };

      setSessions(prev => [...prev, newSess].sort((a, z) => a.date.localeCompare(z.date)));
      setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch }));
      setCreating(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error creating session");
    } finally {
      setSaving(false);
    }
  };

  // ── Quick-start (no form, direct create + navigate) ──────────────────────────
  const handleQuickStart = async () => {
    if (!user || !program) return;
    setQuickStarting(true);
    setQuickStartError("");

    const now = new Date();
    const startTime = addMinutes(now, 5);
    const endTime   = addMinutes(now, 65);
    const batchName = program.batches[0]?.name ?? "Morning";
    const title     = `${batchName} Session`;
    const dateStr   = now.toISOString().split("T")[0];

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          programId: program.id,
          batch:     batchName,
          title,
          date:      dateStr,
          startTime,
          endTime,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { sessionId } = await res.json();

      setQuickStartConfirm(false);
      openSessionLaunch(sessionId);
    } catch (e) {
      setQuickStartError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setQuickStarting(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = async (id: string) => {
    if (!user || !form.title) {
      setFormError("Please fill in title.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/sessions/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          batch: form.batch,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update session");
      setSessions(prev =>
        prev.map(s => s.id === id
          ? { ...s, title: form.title, batch: form.batch, date: form.date, startTime: form.startTime, endTime: form.endTime }
          : s
        ).sort((a, z) => a.date.localeCompare(z.date))
      );
      setEditingId(null);
      setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error updating session");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/sessions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
    setDeletingId(null);
  };

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setCreating(false);
    setForm({ title: s.title, programId: s.programId, batch: s.batch ?? "", date: s.date, startTime: s.startTime, endTime: s.endTime, meetLink: s.meetLink ?? "" });
    setFormError("");
  };

  const copyLink = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  // ── Attendance ──────────────────────────────────────────────────────────────
  const openAttendance = async (session: Session) => {
    if (attendanceOpen === session.id) {
      setAttendanceOpen(null);
      presenceUnsubRef.current?.();
      presenceUnsubRef.current = null;
      setLivePresence(new Set());
      return;
    }
    setAttendanceOpen(session.id);
    setLivePresence(new Set());

    const batchStudents = session.batch
      ? students.filter(r => r.enrollment.batch === session.batch)
      : students;

    // Fetch saved attendance records
    const records = await getAttendanceForSession(session.id);

    // Build draft: saved record wins; fallback absent
    const draft: Record<string, boolean> = {};
    batchStudents.forEach(r => {
      const existing = records.find(a => a.userId === r.userProfile.uid);
      draft[r.userProfile.uid] = existing?.present ?? false;
    });
    setAttendanceDraft(draft);

    // For today's sessions: subscribe to live presence and merge into draft
    if (session.date === today) {
      presenceUnsubRef.current?.();
      presenceUnsubRef.current = subscribeSessionPresence(session.id, (presenceList) => {
        const activeIds = new Set(presenceList.filter(p => p.active).map(p => p.userId));
        setLivePresence(activeIds);
        // Auto-check anyone who is/was present
        setAttendanceDraft(prev => {
          const updated = { ...prev };
          presenceList.forEach(p => {
            // Mark present if they joined at any point (active or not)
            if (batchStudents.some(r => r.userProfile.uid === p.userId)) {
              updated[p.userId] = true;
            }
          });
          return updated;
        });
      });
    }
  };

  const saveAttendance = async (session: Session) => {
    if (!program) return;
    setSavingAttendance(true);
    setAttendanceMsg(null);
    try {
      const batchStudents = session.batch
        ? students.filter(r => r.enrollment.batch === session.batch)
        : students;

      await Promise.all(
        batchStudents.map(r =>
          upsertAttendance({
            sessionId: session.id,
            programId: program.id,
            userId: r.userProfile.uid,
            userName: r.userProfile.name,
            present: attendanceDraft[r.userProfile.uid] ?? false,
            date: session.date,
          })
        )
      );
      setAttendanceMsg("Attendance saved ✓");
      setTimeout(() => setAttendanceMsg(null), 3000);
    } catch {
      setAttendanceMsg("Failed to save. Try again.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // ── Shared form ─────────────────────────────────────────────────────────────
  const renderForm = (onSave: () => void, onCancel: () => void, submitLabel: string) => (
    <div className="p-4 md:p-5 rounded-2xl space-y-4" style={{ background: "rgba(122,140,116,0.07)", border: "1px solid rgba(122,140,116,0.2)" }}>
      {/* Title */}
      <div>
        <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Session Title</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Morning Flow — Week 1"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
        />
      </div>

{/* Batch */}
      <div>
        <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Batch</label>
        {program && program.batches.length > 0 ? (
          <select
            value={form.batch}
            onChange={e => {
              const batchName = e.target.value;
              const batchObj = program.batches.find(b => b.name === batchName);
              const batchStart = batchObj ? parseBatchTime(batchObj.time) : null;
              setForm(f => ({
                ...f,
                batch: batchName,
                startTime: batchStart ?? f.startTime,
                endTime: batchStart
                  ? addMinutes(
                      new Date(f.date + "T" + batchStart + ":00"),
                      60
                    )
                  : f.endTime,
              }));
            }}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(40,38,36,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
          >
            {program.batches.map(b => (
              <option key={b.name} value={b.name}>{b.name} ({b.time})</option>
            ))}
          </select>
        ) : (
          <input
            value={form.batch}
            onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
            placeholder="e.g. Morning"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
          />
        )}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
          />
        </div>
        <div>
          <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Start</label>
          <input
            type="time"
            value={form.startTime}
            onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
          />
        </div>
        <div>
          <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>End</label>
          <input
            type="time"
            value={form.endTime}
            onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
          />
        </div>
      </div>

      {/* Jitsi link auto-generated on save */}
      <p className="text-xs" style={{ color: "rgba(246,244,239,0.45)" }}>
        A Jitsi Meet link will be generated automatically when you save.
      </p>

{formError && <p className="text-xs" style={{ color: "#c04040" }}>{formError}</p>}

      <div className="flex gap-3 pt-1">
        <motion.button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-xs tracking-widest uppercase"
          style={{ background: "#7A8C74", color: "#F6F4EF", minHeight: "42px" }}
          whileHover={{ background: "#6a7c64" }}
          whileTap={{ scale: 0.97 }}
        >
          {saving ? "Saving…" : submitLabel}
        </motion.button>
        <motion.button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)", minHeight: "42px" }}
          whileHover={{ background: "rgba(255,255,255,0.1)" }}
        >
          Cancel
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Session disclaimer ── */}
      <motion.div
        className="rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{ background: "rgba(212,168,71,0.08)", border: "1px solid rgba(212,168,71,0.2)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "#D4A847" }}>
            Do not close the session page once it has started
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(246,244,239,0.45)" }}>
            Closing or refreshing the session window mid-class will disconnect you from the Jitsi room.
            Students will lose their guide and may not be able to reconnect properly.
            Keep the session page open for the full duration of the class.
          </p>
        </div>
      </motion.div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h2
          className="text-2xl"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          My Sessions
        </motion.h2>
        {/* Quick: Start in 5 min */}
        {!creating && program && (
          <motion.button
            onClick={() => { setQuickStartConfirm(true); setQuickStartError(""); }}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase"
            style={{ background: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.25)", minHeight: "42px" }}
            whileHover={{ background: "rgba(220,38,38,0.25)" }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="hidden sm:inline">Start in 5 min</span>
            <span className="sm:hidden">5 min</span>
          </motion.button>
        )}
        <motion.button
          onClick={() => { setCreating(c => !c); setEditingId(null); setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch })); setFormError(""); }}
          className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase"
          style={{
            background: creating ? "rgba(255,255,255,0.06)" : "#7A8C74",
            color: creating ? "rgba(246,244,239,0.5)" : "#F6F4EF",
            minHeight: "42px",
          }}
          whileHover={{ opacity: 0.85 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Plus size={13} />
          <span className="hidden sm:inline">{creating ? "Cancel" : "New Session"}</span>
          <span className="sm:hidden">{creating ? "✕" : "New"}</span>
        </motion.button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {renderForm(
              handleCreate,
              () => { setCreating(false); setFormError(""); setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch })); },
              "Create Session"
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["upcoming", "past"] as Tab[]).map(t => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs tracking-widest uppercase"
            animate={{
              background: tab === t ? "rgba(122,140,116,0.2)" : "transparent",
              color: tab === t ? "#7A8C74" : "rgba(246,244,239,0.4)",
            }}
            whileHover={{ background: "rgba(122,140,116,0.1)" }}
          >
            {t} ({t === "upcoming" ? upcoming.length : past.length})
          </motion.button>
        ))}
      </div>

      {/* Session list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div
          className="p-12 rounded-2xl text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Calendar size={28} style={{ color: "rgba(246,244,239,0.2)", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", color: "rgba(246,244,239,0.5)", fontWeight: 300 }}>
            {tab === "upcoming" ? "No upcoming sessions" : "No past sessions"}
          </p>
          {tab === "upcoming" && (
            <p className="text-xs mt-2" style={{ color: "rgba(246,244,239,0.3)" }}>
              Click &quot;New Session&quot; above to schedule one.
            </p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {displayed.map((s, i) => {
            const isEditing         = editingId === s.id;
            const isToday           = s.date === today;
            const isAttendanceOpen  = attendanceOpen === s.id;
            const batchStudents     = s.batch
              ? students.filter(r => r.enrollment.batch === s.batch)
              : students;

            // Compute fine-grained status for today's sessions
            const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            const startMins = sh * 60 + sm;
            const endMins   = eh * 60 + em;
            const isLive    = isToday && nowMins >= startMins && nowMins <= endMins;
            const isOver    = isToday && nowMins > endMins;

            const cardBorder = isLive ? "rgba(220,38,38,0.45)"
              : isOver  ? "rgba(255,255,255,0.12)"
              : isToday ? "rgba(122,140,116,0.4)"
              : "rgba(255,255,255,0.08)";

            const cardBg = isLive ? "rgba(220,38,38,0.06)"
              : isOver  ? "rgba(255,255,255,0.03)"
              : isToday ? "rgba(122,140,116,0.08)"
              : "rgba(255,255,255,0.04)";

            return (
              <motion.div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${cardBorder}` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Card header */}
                <div className="p-3 md:p-4" style={{ background: cardBg }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium" style={{ color: isOver ? "rgba(246,244,239,0.55)" : "#F6F4EF" }}>{s.title}</p>
                        {isLive && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.35)" }}>
                            <motion.span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"
                              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                            Live
                          </span>
                        )}
                        {isOver && (
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.4)" }}>
                            Session Over
                          </span>
                        )}
                        {isToday && !isLive && !isOver && (
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}>
                            Today
                          </span>
                        )}
                        {s.batch && (
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}>
                            {s.batch}
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                        {formatDate(s.date)} · {s.startTime}–{s.endTime}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Start/Join — only while live or upcoming today */}
                      {isToday && !isOver && (
                        <motion.button
                          onClick={() => openSessionLaunch(s.id, s.meetLink)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: isLive ? "rgba(220,38,38,0.2)" : "rgba(122,140,116,0.15)",
                            color: isLive ? "#ef4444" : "#7A8C74",
                            border: `1px solid ${isLive ? "rgba(220,38,38,0.35)" : "rgba(122,140,116,0.3)"}`,
                          }}
                          whileHover={{ opacity: 0.85 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Play size={10} fill="currentColor" />
                          <span className="hidden sm:inline">{isLive ? "Join Live" : "Start Session"}</span>
                          <span className="sm:hidden">{isLive ? "Join" : "Start"}</span>
                        </motion.button>
                      )}
                      {/* View Attendance — after session ends today, or any past session */}
                      {(isOver || tab === "past") && (
                        <motion.button
                          onClick={() => openAttendance(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{
                            background: isAttendanceOpen ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.06)",
                            color: isAttendanceOpen ? "#7A8C74" : "rgba(246,244,239,0.5)",
                            border: `1px solid ${isAttendanceOpen ? "rgba(122,140,116,0.3)" : "rgba(255,255,255,0.08)"}`,
                          }}
                          title="View / mark attendance"
                          whileHover={{ background: "rgba(122,140,116,0.15)" }}
                          whileTap={{ scale: 0.92 }}
                        >
                          <Users size={11} />
                          <span className="hidden sm:inline">Attendance</span>
                        </motion.button>
                      )}
                      {/* Attendance icon during live session */}
                      {isLive && (
                        <motion.button
                          onClick={() => openAttendance(s)}
                          className="p-2 rounded-lg"
                          style={{
                            background: isAttendanceOpen ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.06)",
                            color: isAttendanceOpen ? "#7A8C74" : "rgba(246,244,239,0.5)",
                          }}
                          title="Live attendance"
                          whileHover={{ background: "rgba(122,140,116,0.15)" }}
                          whileTap={{ scale: 0.92 }}
                        >
                          <Users size={12} />
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => copyLink(s.meetLink, s.id)}
                        className="p-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                        title="Copy meet link"
                        whileHover={{ background: "rgba(255,255,255,0.12)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        {copied === s.id
                          ? <span style={{ fontSize: "10px", color: "#7A8C74" }}>✓</span>
                          : <Copy size={12} />}
                      </motion.button>
                      <motion.button
                        onClick={() => openSessionLaunch(s.id, s.meetLink)}
                        className="p-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                        title="Open session room"
                        whileHover={{ background: "rgba(255,255,255,0.12)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <ExternalLink size={12} />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          if (isEditing) { setEditingId(null); setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch })); }
                          else startEdit(s);
                        }}
                        className="p-2 rounded-lg"
                        style={{
                          background: isEditing ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.06)",
                          color: isEditing ? "#7A8C74" : "rgba(246,244,239,0.5)",
                        }}
                        title="Edit"
                        whileHover={{ background: "rgba(255,255,255,0.12)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <Edit2 size={12} />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="p-2 rounded-lg"
                        style={{ background: "rgba(192,64,64,0.1)", color: "#c04040" }}
                        title="Delete"
                        whileHover={{ background: "rgba(192,64,64,0.2)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        {deletingId === s.id ? <span style={{ fontSize: "10px" }}>…</span> : <Trash2 size={12} />}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Inline edit form */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      key="edit-form"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="p-3 md:p-4">
                        {renderForm(
                          () => handleEdit(s.id),
                          () => { setEditingId(null); setForm(f => ({ ...EMPTY_FORM, programId: f.programId, batch: f.batch })); setFormError(""); },
                          "Save Changes"
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attendance panel */}
                <AnimatePresence>
                  {isAttendanceOpen && (
                    <motion.div
                      key="attendance"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="p-4 md:p-5 space-y-3" style={{ background: "rgba(122,140,116,0.04)" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs tracking-widest uppercase" style={{ color: "#7A8C74" }}>
                            {isToday ? "Live Attendance" : "Attendance"} — {s.batch ?? "All Students"}
                          </p>
                          {isToday && (
                            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(246,244,239,0.4)" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              {livePresence.size} online now
                            </span>
                          )}
                        </div>
                        {isToday && (
                          <p className="text-[11px]" style={{ color: "rgba(246,244,239,0.35)" }}>
                            Students are auto-marked present when they join the session room. You can still override below.
                          </p>
                        )}
                        {batchStudents.length === 0 ? (
                          <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>
                            No students in this batch.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {batchStudents.map(row => {
                              const isOnline = livePresence.has(row.userProfile.uid);
                              return (
                                <div key={row.userProfile.uid} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isToday && (
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-500" : "bg-zinc-600"}`} />
                                    )}
                                    <p className="text-sm truncate" style={{ color: "#F6F4EF" }}>{row.userProfile.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {["Present", "Absent"].map(label => (
                                      <motion.button
                                        key={label}
                                        onClick={() => setAttendanceDraft(d => ({ ...d, [row.userProfile.uid]: label === "Present" }))}
                                        className="px-3 py-1 rounded-lg text-xs"
                                        animate={{
                                          background: (attendanceDraft[row.userProfile.uid] ?? false) === (label === "Present")
                                            ? (label === "Present" ? "rgba(122,140,116,0.3)" : "rgba(192,64,64,0.2)")
                                            : "rgba(255,255,255,0.05)",
                                          color: (attendanceDraft[row.userProfile.uid] ?? false) === (label === "Present")
                                            ? (label === "Present" ? "#7A8C74" : "#c04040")
                                            : "rgba(246,244,239,0.4)",
                                        }}
                                        whileHover={{ opacity: 0.8 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        {label}
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <motion.button
                            onClick={() => saveAttendance(s)}
                            disabled={savingAttendance}
                            className="px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase"
                            style={{ background: "#7A8C74", color: "#F6F4EF", minHeight: "38px" }}
                            whileHover={{ background: "#6a7c64" }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {savingAttendance ? "Saving…" : "Save Attendance"}
                          </motion.button>
                          {attendanceMsg && (
                            <p className="text-xs" style={{ color: attendanceMsg.includes("✓") ? "#7A8C74" : "#c04040" }}>
                              {attendanceMsg}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Quick-start confirmation modal ── */}
      <AnimatePresence>
        {quickStartConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setQuickStartConfirm(false); }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: "#1E1D1B", border: "1px solid rgba(255,255,255,0.1)" }}
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {/* Pulse icon */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.15)" }}>
                  <motion.span
                    className="w-3 h-3 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#F6F4EF" }}>Start a session in 5 minutes?</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.45)" }}>
                    A live session will be created for your students right now.
                  </p>
                </div>
              </div>

              {/* Session details preview */}
              {program && (
                <div
                  className="rounded-xl px-4 py-3 mb-5 space-y-1.5"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {[
                    { label: "Program",   value: program.title },
                    { label: "Batch",     value: program.batches[0]?.name ?? "Morning" },
                    { label: "Starts at", value: (() => {
                      const t = addMinutes(new Date(), 5);
                      const [h, m] = t.split(":").map(Number);
                      const ap = h >= 12 ? "PM" : "AM";
                      return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,"0")} ${ap}`;
                    })() },
                    { label: "Duration",  value: "60 min" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{label}</span>
                      <span className="text-xs font-medium" style={{ color: "rgba(246,244,239,0.8)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {quickStartError && (
                <p className="text-xs mb-4 text-center" style={{ color: "#ef4444" }}>{quickStartError}</p>
              )}

              <div className="flex gap-3">
                <motion.button
                  onClick={handleQuickStart}
                  disabled={quickStarting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#dc2626", color: "#fff" }}
                  whileHover={{ background: "#b91c1c" }}
                  whileTap={{ scale: 0.97 }}
                >
                  {quickStarting ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Starting…
                    </span>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      Yes, Start Session
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={() => { setQuickStartConfirm(false); setQuickStartError(""); }}
                  disabled={quickStarting}
                  className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.6)" }}
                  whileHover={{ background: "rgba(255,255,255,0.12)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
