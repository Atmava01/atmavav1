"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Copy, ExternalLink, Calendar, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSessionsByMentor,
  getPrograms,
  getStudentsForProgram,
  getAttendanceForSession,
  upsertAttendance,
} from "@/lib/firestore";
import type { Session, Program, Enrollment, UserProfile, Attendance } from "@/types";

type Tab = "upcoming" | "past";
type StudentRow = { enrollment: Enrollment; userProfile: UserProfile };

const PROGRAMS = [
  { id: "30", label: "30-Day Foundation" },
  { id: "60", label: "60-Day Deepening" },
  { id: "90", label: "90-Day Inner Mastery" },
];

const EMPTY_FORM = {
  title: "",
  programId: "30",
  batch: "",
  date: new Date().toISOString().split("T")[0],
  startTime: "06:30",
  endTime: "07:30",
  meetLink: "",
};

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
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, boolean>>({}); // userId → present
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [allSessions, allPrograms] = await Promise.all([
          getSessionsByMentor(user!.uid),
          getPrograms(),
        ]);
        if (cancelled) return;

        setSessions(allSessions.sort((a, z) => a.date.localeCompare(z.date)));

        const myProgram = allPrograms.find(p => p.mentorId === user!.uid) ?? null;
        setProgram(myProgram);

        if (myProgram) {
          const rows = await getStudentsForProgram(myProgram.id);
          if (!cancelled) setStudents(rows);

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
    return () => { cancelled = true; };
  }, [user?.uid]);

  const upcoming  = sessions.filter(s => s.date >= today);
  const past      = sessions.filter(s => s.date <  today);
  const displayed = tab === "upcoming" ? upcoming : past;

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user || !form.title || !form.date || !form.meetLink) {
      setFormError("Please fill in title, date, and meet link.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          programId: form.programId,
          batch: form.batch,
          title: form.title,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          meetLink: form.meetLink,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create session");
      const { sessionId } = await res.json();
      const newSess: Session = {
        id: sessionId,
        programId: form.programId,
        batch: form.batch,
        mentorId: user.uid,
        mentorName: userProfile?.name ?? "Mentor",
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        meetLink: form.meetLink,
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

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = async (id: string) => {
    if (!user || !form.title || !form.meetLink) {
      setFormError("Please fill in title and meet link.");
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
          meetLink: form.meetLink,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update session");
      setSessions(prev =>
        prev.map(s => s.id === id
          ? { ...s, title: form.title, batch: form.batch, date: form.date, startTime: form.startTime, endTime: form.endTime, meetLink: form.meetLink }
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
    setForm({ title: s.title, programId: s.programId, batch: s.batch ?? "", date: s.date, startTime: s.startTime, endTime: s.endTime, meetLink: s.meetLink });
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
      return;
    }
    setAttendanceOpen(session.id);

    // Fetch existing attendance records if not already loaded
    if (!attendanceData[session.id]) {
      const records = await getAttendanceForSession(session.id);
      setAttendanceData(prev => ({ ...prev, [session.id]: records }));
      // Build draft from existing records
      const draft: Record<string, boolean> = {};
      // Get students for this batch
      const batchStudents = session.batch
        ? students.filter(r => r.enrollment.batch === session.batch)
        : students;
      batchStudents.forEach(r => {
        const existing = records.find(a => a.userId === r.userProfile.uid);
        draft[r.userProfile.uid] = existing?.present ?? false;
      });
      setAttendanceDraft(draft);
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

      {/* Program */}
      <div>
        <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Program</label>
        <select
          value={form.programId}
          onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(40,38,36,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
        >
          {PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* Batch */}
      <div>
        <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Batch</label>
        {program && program.batches.length > 0 ? (
          <select
            value={form.batch}
            onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
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

      {/* Meet link */}
      <div>
        <label className="text-xs tracking-widest uppercase mb-1.5 block" style={{ color: "rgba(246,244,239,0.45)" }}>Meet / Zoom Link</label>
        <input
          value={form.meetLink}
          onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))}
          placeholder="https://meet.google.com/… or https://zoom.us/…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
        />
      </div>

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

            return (
              <motion.div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${isToday ? "rgba(122,140,116,0.4)" : "rgba(255,255,255,0.08)"}` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Card header */}
                <div className="p-3 md:p-4" style={{ background: isToday ? "rgba(122,140,116,0.08)" : "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{s.title}</p>
                        {isToday && (
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
                      {/* Attendance button — only for past sessions */}
                      {tab === "past" && (
                        <motion.button
                          onClick={() => openAttendance(s)}
                          className="p-2 rounded-lg"
                          style={{
                            background: isAttendanceOpen ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.06)",
                            color: isAttendanceOpen ? "#7A8C74" : "rgba(246,244,239,0.5)",
                          }}
                          title="Mark attendance"
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
                      {s.meetLink ? (
                        <a href={s.meetLink} target="_blank" rel="noopener noreferrer">
                          <motion.button
                            className="p-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                            title="Open meet link"
                            whileHover={{ background: "rgba(255,255,255,0.12)" }}
                            whileTap={{ scale: 0.92 }}
                          >
                            <ExternalLink size={12} />
                          </motion.button>
                        </a>
                      ) : (
                        <span
                          className="p-2 rounded-lg flex items-center justify-center"
                          title="No meet link set"
                          style={{ background: "rgba(255,255,255,0.03)", color: "rgba(246,244,239,0.2)", cursor: "default" }}
                        >
                          <ExternalLink size={12} />
                        </span>
                      )}
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
                        <p className="text-xs tracking-widest uppercase" style={{ color: "#7A8C74" }}>
                          Mark Attendance — {s.batch ?? "All Students"}
                        </p>
                        {batchStudents.length === 0 ? (
                          <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>
                            No students in this batch.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {batchStudents.map(row => (
                              <div key={row.userProfile.uid} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <p className="text-sm" style={{ color: "#F6F4EF" }}>{row.userProfile.name}</p>
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
                            ))}
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
    </div>
  );
}
