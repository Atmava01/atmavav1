"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Trash2, Users, User, Loader, ChevronDown, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMentorAssignmentSnapshot,
  createGuideNote, deleteGuideNote, subscribeGuideNotesByMentor,
} from "@/lib/firestore";
import type { GuideNote, UserProfile, Program } from "@/types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, photoURL, size = 36 }: { name: string; photoURL?: string | null; size?: number }) {
  const initials = name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  if (photoURL) {
    return <img src={photoURL} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 select-none"
      style={{
        width: size, height: size,
        background: "radial-gradient(circle at 35% 35%, #7A8C74, #3D4A39)",
        fontSize: size * 0.32, color: "rgba(246,244,239,0.9)", fontWeight: 500,
        fontFamily: "'Cormorant Garamond', serif",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note, currentMentorId, onDelete,
}: { note: GuideNote; currentMentorId: string; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await onDelete(note.id);
  };

  return (
    <motion.div
      layout
      className="rounded-2xl p-4"
      style={{ background: "rgba(246,244,239,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: deleting ? 0 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{note.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {note.targetUserId === null ? (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}>
                <Users size={9} /> All Students
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(92,107,87,0.15)", color: "rgba(246,244,239,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <User size={9} /> {note.targetUserName ?? "Student"}
              </span>
            )}
            <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.3)" }}>
              {timeAgo(note.createdAt)} · {fmtDate(note.createdAt)}
            </span>
          </div>
        </div>

        {note.mentorId === currentMentorId && (
          <motion.button
            onClick={handleDelete}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
            style={{
              background: confirming ? "rgba(239,68,68,0.15)" : "transparent",
              color: confirming ? "#ef4444" : "rgba(246,244,239,0.3)",
              border: confirming ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {deleting ? <Loader size={11} className="animate-spin" /> : <Trash2 size={11} />}
            {confirming && !deleting ? "Confirm" : ""}
          </motion.button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed" style={{ color: "rgba(246,244,239,0.7)", fontWeight: 300, whiteSpace: "pre-wrap" }}>
        {note.content}
      </p>

      {/* Click-away to cancel confirm */}
      {confirming && (
        <button
          className="text-[10px] mt-2"
          style={{ color: "rgba(246,244,239,0.3)" }}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MentorGuideNotes() {
  const { user, userProfile } = useAuth();

  const [program, setProgram]   = useState<Program | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [notes, setNotes]       = useState<GuideNote[]>([]);
  const [loading, setLoading]   = useState(true);

  // Compose state
  const [title, setTitle]               = useState("");
  const [content, setContent]           = useState("");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [posting, setPosting]           = useState(false);

  // Load program + students
  useEffect(() => {
    if (!user) return;
    (async () => {
      const token = await user.getIdToken();
      const { program: myProgram, students: assignedStudents } = await getMentorAssignmentSnapshot(token);
      if (!myProgram) { setLoading(false); return; }
      setProgram(myProgram);
      setStudents(assignedStudents.map(e => e.userProfile));
    })();
  }, [user, userProfile?.name]);

  // Subscribe to notes in real-time
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeGuideNotesByMentor(user.uid, ns => {
      setNotes(ns);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const selectedStudent = students.find(s => s.uid === targetUserId) ?? null;

  const handlePost = async () => {
    if (!user || !userProfile || !program || !title.trim() || !content.trim()) return;
    setPosting(true);
    await createGuideNote({
      mentorId: user.uid,
      mentorName: userProfile.name,
      mentorPhotoURL: userProfile.photoURL ?? null,
      programId: program.id,
      targetUserId: targetUserId ?? null,
      targetUserName: selectedStudent?.name ?? null,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setTitle(""); setContent(""); setTargetUserId(null); setPosting(false);
  };

  const handleDelete = async (noteId: string) => {
    await deleteGuideNote(noteId);
  };

  if (!user || !userProfile) return null;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.75rem", fontWeight: 300, color: "#F6F4EF" }}>
          Note from Guide
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.4)" }}>
          Post a personal message or guidance note to your students
        </p>
      </div>

      {/* Compose box */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(246,244,239,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
          New Note
        </p>

        {/* Recipient selector */}
        <div className="relative">
          <button
            onClick={() => setShowStudentPicker(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-left"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }}
          >
            <div className="flex items-center gap-2">
              {targetUserId === null ? (
                <><Users size={14} style={{ color: "#7A8C74" }} /><span style={{ color: "rgba(246,244,239,0.7)" }}>All Students</span></>
              ) : (
                <><User size={14} style={{ color: "#7A8C74" }} /><span>{selectedStudent?.name ?? "Selected Student"}</span></>
              )}
            </div>
            <ChevronDown size={14} style={{ color: "rgba(246,244,239,0.4)", transform: showStudentPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          <AnimatePresence>
            {showStudentPicker && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden"
                style={{ background: "#2C2B29", border: "1px solid rgba(255,255,255,0.1)", maxHeight: 220, overflowY: "auto" }}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                {/* All students option */}
                <button
                  onClick={() => { setTargetUserId(null); setShowStudentPicker(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                  style={{
                    background: targetUserId === null ? "rgba(122,140,116,0.15)" : "transparent",
                    color: "#F6F4EF",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Users size={13} style={{ color: "#7A8C74" }} />
                  <span className="font-medium">All Students</span>
                  <span className="ml-auto text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>
                    {students.length} enrolled
                  </span>
                </button>

                {/* Individual students */}
                {students.map(s => (
                  <button
                    key={s.uid}
                    onClick={() => { setTargetUserId(s.uid); setShowStudentPicker(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                    style={{
                      background: targetUserId === s.uid ? "rgba(122,140,116,0.15)" : "transparent",
                      color: "#F6F4EF",
                    }}
                    onMouseEnter={e => !( targetUserId === s.uid) && (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => !( targetUserId === s.uid) && (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar name={s.name} photoURL={s.photoURL} size={26} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate">{s.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "rgba(246,244,239,0.35)" }}>{s.email}</p>
                    </div>
                  </button>
                ))}

                {students.length === 0 && (
                  <p className="px-4 py-3 text-xs" style={{ color: "rgba(246,244,239,0.35)" }}>No students enrolled yet</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#F6F4EF",
          }}
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your note, guidance, or encouragement…"
          rows={4}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#F6F4EF",
            fontWeight: 300,
          }}
        />

        {/* Post button */}
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>
            {targetUserId === null
              ? `Will be visible to all ${students.length} students`
              : `Personal note for ${selectedStudent?.name ?? "student"}`}
          </p>
          <motion.button
            onClick={handlePost}
            disabled={!title.trim() || !content.trim() || posting || !program}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs tracking-wider uppercase"
            style={{
              background: title.trim() && content.trim() ? "#5C6B57" : "rgba(92,107,87,0.2)",
              color: title.trim() && content.trim() ? "#F6F4EF" : "rgba(246,244,239,0.3)",
            }}
            whileTap={{ scale: 0.96 }}
          >
            {posting ? <Loader size={13} className="animate-spin" /> : <><Send size={12} /> Post Note</>}
          </motion.button>
        </div>
      </div>

      {/* Posted notes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
            Posted Notes
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74" }}>
            {notes.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#5C6B57" }}
            />
          </div>
        ) : notes.length === 0 ? (
          <motion.div
            className="rounded-2xl p-10 flex flex-col items-center text-center"
            style={{ background: "rgba(246,244,239,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MessageSquare size={28} style={{ color: "rgba(246,244,239,0.15)", marginBottom: 12 }} />
            <p className="text-sm" style={{ color: "rgba(246,244,239,0.3)", fontWeight: 300 }}>
              No notes posted yet
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.2)" }}>
              Your first note will appear here
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                currentMentorId={user.uid}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
