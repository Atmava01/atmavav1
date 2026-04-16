"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, ChevronLeft, BookOpen, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMentorAssignmentSnapshot, subscribeSharedJournalsByUsers } from "@/lib/firestore";
import type { JournalEntry } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#5C6B57","#7A8C74","#8FA3B0","#B87333","#6E5B7A","#7A5B4E"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ─── Entry list item ──────────────────────────────────────────────────────────

function EntryCard({ entry, active, onClick }: { entry: JournalEntry; active: boolean; onClick: () => void }) {
  const preview = entry.content.replace(/\n/g, " ").slice(0, 80);
  return (
    <motion.button onClick={onClick}
      className="w-full text-left px-4 py-3.5 rounded-2xl relative"
      animate={{
        background: active ? "rgba(122,140,116,0.12)" : "transparent",
        borderColor: active ? "rgba(122,140,116,0.28)" : "rgba(255,255,255,0.07)",
      }}
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
      whileHover={{ background: active ? "rgba(122,140,116,0.15)" : "rgba(255,255,255,0.04)" }}
      whileTap={{ scale: 0.985 }}>

      {/* Student info */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
          style={{ background: avatarColor(entry.userName), color: "#F6F4EF" }}>
          {initials(entry.userName)}
        </div>
        <span className="text-xs font-medium" style={{ color: "#F6F4EF" }}>{entry.userName}</span>
        {entry.mood && <span className="text-sm leading-none">{entry.mood}</span>}
      </div>

      {/* Title */}
      <p className="text-sm font-medium truncate mb-0.5" style={{ color: "rgba(246,244,239,0.9)" }}>
        {entry.title || "Untitled"}
      </p>

      {/* Preview */}
      {preview && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "rgba(246,244,239,0.4)" }}>
          {preview}
        </p>
      )}

      <p className="text-[10px] mt-1.5" style={{ color: "rgba(246,244,239,0.25)" }}>
        {formatDateShort(entry.createdAt)}
      </p>

      {active && (
        <motion.div layoutId="mentor-journal-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full"
          style={{ background: "#7A8C74" }} />
      )}
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MentorJournals() {
  const { user, userProfile } = useAuth();

  const [entries, setEntries]         = useState<JournalEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<JournalEntry | null>(null);
  const [search, setSearch]           = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [mobileReader, setMobileReader]   = useState(false);

  // Load mentor's students, then subscribe to their shared journals
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;

    async function load() {
      const token = await user!.getIdToken();
      const { students } = await getMentorAssignmentSnapshot(token);
      if (cancelled) return;
      const userIds = students.map(s => s.userProfile.uid);

      unsub = subscribeSharedJournalsByUsers(userIds, list => {
        setEntries(list);
        setLoading(false);
      });
    }

    load();
    return () => { cancelled = true; unsub?.(); };
  }, [user?.uid, userProfile?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique students
  const students = Array.from(new Map(entries.map(e => [e.userId, e.userName])).entries());

  const filtered = entries.filter(e => {
    const matchesStudent = studentFilter === "all" || e.userId === studentFilter;
    const matchesSearch  = !search || e.title.toLowerCase().includes(search.toLowerCase())
      || e.content.toLowerCase().includes(search.toLowerCase())
      || e.userName.toLowerCase().includes(search.toLowerCase());
    return matchesStudent && matchesSearch;
  });

  const openEntry = (e: JournalEntry) => {
    setSelected(e);
    setMobileReader(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex overflow-hidden rounded-3xl"
      style={{ height: "calc(100vh - 48px)", background: "#1A1917", border: "1px solid rgba(255,255,255,0.07)" }}>

      {/* ── LIST PANEL ────────────────────────────────────────────────────── */}
      <div className={`flex flex-col flex-shrink-0 ${mobileReader ? "hidden md:flex" : "flex w-full md:w-auto"}`}
        style={{ width: 300, borderRight: "1px solid rgba(255,255,255,0.07)", background: "#141412" }}>

        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={15} style={{ color: "#7A8C74" }} />
            <h2 className="text-xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF" }}>
              Student Journals
            </h2>
          </div>
          <p className="text-[11px] mb-4" style={{ color: "rgba(246,244,239,0.3)" }}>
            {filtered.length} shared {filtered.length === 1 ? "entry" : "entries"}
            {studentFilter !== "all" && ` from ${entries.find(e => e.userId === studentFilter)?.userName ?? ""}`}
          </p>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Search size={12} style={{ color: "rgba(246,244,239,0.3)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entries…"
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "rgba(246,244,239,0.7)" }} />
          </div>

          {/* Student filter */}
          {students.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <motion.button onClick={() => setStudentFilter("all")}
                className="px-2.5 py-1 rounded-lg text-[10px]"
                animate={{
                  background: studentFilter === "all" ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                  color: studentFilter === "all" ? "#7A8C74" : "rgba(246,244,239,0.35)",
                }}
                whileTap={{ scale: 0.95 }}>
                All
              </motion.button>
              {students.map(([uid, name]) => (
                <motion.button key={uid} onClick={() => setStudentFilter(uid)}
                  className="px-2.5 py-1 rounded-lg text-[10px]"
                  animate={{
                    background: studentFilter === uid ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                    color: studentFilter === uid ? "#7A8C74" : "rgba(246,244,239,0.35)",
                  }}
                  whileTap={{ scale: 0.95 }}>
                  {name.split(" ")[0]}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {loading ? (
            <div className="flex justify-center pt-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 gap-3 px-4 text-center">
              <Eye size={22} style={{ color: "rgba(122,140,116,0.3)" }} />
              <p className="text-sm font-light" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(246,244,239,0.4)" }}>
                {entries.length === 0 ? "No shared entries yet" : "No results found"}
              </p>
              {entries.length === 0 && (
                <p className="text-xs" style={{ color: "rgba(246,244,239,0.25)" }}>
                  Students can choose to share entries with you
                </p>
              )}
            </div>
          ) : (
            filtered.map(e => (
              <EntryCard key={e.id} entry={e}
                active={selected?.id === e.id}
                onClick={() => openEntry(e)} />
            ))
          )}
        </div>
      </div>

      {/* ── READER PANEL ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!mobileReader && "hidden md:flex"}`}
        style={{ background: "#1A1917" }}>

        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(122,140,116,0.08)", border: "1px solid rgba(122,140,116,0.15)" }}>
              <BookOpen size={22} style={{ color: "rgba(122,140,116,0.45)" }} />
            </div>
            <div>
              <p className="text-lg font-light mb-1.5"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(246,244,239,0.6)" }}>
                Select an entry to read
              </p>
              <p className="text-xs" style={{ color: "rgba(246,244,239,0.25)" }}>
                Only entries students choose to share appear here
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Reader toolbar */}
            <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#141412" }}>
              <button className="md:hidden p-1.5 rounded-lg -ml-1.5"
                style={{ color: "rgba(246,244,239,0.4)" }}
                onClick={() => setMobileReader(false)}>
                <ChevronLeft size={18} />
              </button>

              {/* Student avatar + name */}
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                  style={{ background: avatarColor(selected.userName), color: "#F6F4EF" }}>
                  {initials(selected.userName)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{selected.userName}</p>
                  <p className="text-[10px]" style={{ color: "rgba(246,244,239,0.3)" }}>
                    {formatDateLong(selected.createdAt)}
                  </p>
                </div>
              </div>

              {/* Shared badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: "rgba(122,140,116,0.12)", border: "1px solid rgba(122,140,116,0.22)", color: "#7A8C74" }}>
                <Eye size={11} /> Shared with you
              </div>
            </div>

            {/* Entry content (read-only) */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-6 md:px-14 py-10 pb-24">

                {/* Mood */}
                {selected.mood && (
                  <div className="mb-6">
                    <span className="text-3xl">{selected.mood}</span>
                  </div>
                )}

                {/* Title */}
                <h1 className="font-light mb-5 leading-tight"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "2rem",
                    color: "#F6F4EF",
                  }}>
                  {selected.title || "Untitled"}
                </h1>

                <div className="mb-7" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

                {/* Body */}
                <div className="leading-[1.9] whitespace-pre-wrap"
                  style={{
                    fontSize: "1rem",
                    color: "rgba(246,244,239,0.72)",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    letterSpacing: "0.012em",
                  }}>
                  {selected.content || <span style={{ color: "rgba(246,244,239,0.2)" }}>No content</span>}
                </div>

                {/* Footer */}
                <div className="mt-10 flex items-center gap-4 pt-6"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {selected.content && (
                    <p className="text-[11px]" style={{ color: "rgba(246,244,239,0.25)" }}>
                      {wordCount(selected.content)} words
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: "rgba(246,244,239,0.2)" }}>
                    Written on {formatDateShort(selected.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
