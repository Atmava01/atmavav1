"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Lock, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeJournalEntries, createJournalEntry,
  updateJournalEntry, deleteJournalEntry,
  getActiveEnrollment, getProgramById,
} from "@/lib/firestore";
import type { JournalEntry, Enrollment, Program } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const FEELINGS = [
  { id: "Tired",     emoji: "😴", label: "Tired"     },
  { id: "Neutral",   emoji: "😐", label: "Neutral"   },
  { id: "Good",      emoji: "😊", label: "Good"      },
  { id: "Energised", emoji: "✨", label: "Energised" },
  { id: "Motivated", emoji: "🔥", label: "Motivated" },
];

const PRACTICE_TIPS = [
  "Writing even 2–3 sentences after each session significantly deepens integration. The journal is where the practice lands and becomes wisdom.",
  "Consistency matters more than length. A brief honest entry beats a long one written once a week.",
  "Notice what arises in your body as you write. The body knows things the mind is still catching up to.",
  "Try to write within 30 minutes of your session while the experience is still fresh.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split("T")[0]; }

function fmtDateLong(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function longestStreak(entries: JournalEntry[]): number {
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    cur = diff === 1 ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly = false }: { value: number | null; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = (hover ?? value ?? 0) >= star;
        return (
          <button key={star}
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(null)}
            className={readonly ? "cursor-default" : "cursor-pointer"}
            style={{ background: "none", border: "none", padding: "2px", fontSize: readonly ? "0.9rem" : "1.4rem", color: filled ? "#C49A3C" : "#D4CCBF", lineHeight: 1 }}>
            ★
          </button>
        );
      })}
    </div>
  );
}

// ─── This Week's Mood ─────────────────────────────────────────────────────────

function WeeklyMoodPanel({ entries }: { entries: JournalEntry[] }) {
  const weekDays = getWeekDays();
  const byDate: Record<string, JournalEntry> = {};
  entries.forEach(e => { if (!byDate[e.date]) byDate[e.date] = e; });
  const today = todayStr();
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #D4CCBF" }}>
      <p className="text-xs font-medium mb-3" style={{ color: "#2C2B29" }}>This Week&apos;s Mood</p>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((date, i) => {
          const entry = byDate[date];
          const feeling = FEELINGS.find(f => f.id === entry?.feeling);
          const isToday = date === today;
          const isFuture = date > today;
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <span className="text-base" style={{ opacity: isFuture ? 0.25 : 1 }}>
                {feeling ? feeling.emoji : isFuture ? "·" : "—"}
              </span>
              <span className="text-[9px]" style={{ color: isToday ? "#5C6B57" : "#C4BDB5", fontWeight: isToday ? 600 : 400 }}>
                {dayLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px]" style={{ color: "#C4BDB5" }}>
        {Object.keys(byDate).filter(d => d <= today && weekDays.includes(d)).length} of 7 days logged this week
      </p>
    </div>
  );
}

// ─── Journal Stats ────────────────────────────────────────────────────────────

function JournalStatsPanel({ entries }: { entries: JournalEntry[] }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const rated = entries.filter(e => e.rating != null);
  const avgRating = rated.length ? (rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length).toFixed(1) : null;
  const fiveStar = entries.filter(e => e.rating === 5).length;
  const thisMonthCount = entries.filter(e => e.date?.startsWith(thisMonth)).length;
  const streak = longestStreak(entries);
  const feelingCounts: Record<string, number> = {};
  entries.forEach(e => { if (e.feeling) feelingCounts[e.feeling] = (feelingCounts[e.feeling] ?? 0) + 1; });
  const topFeeling = Object.entries(feelingCounts).sort((a, b) => b[1] - a[1])[0];
  const topFeelingInfo = FEELINGS.find(f => f.id === topFeeling?.[0]);

  const stats = [
    { label: "Total entries",           value: entries.length.toString() },
    { label: "Average rating",          value: avgRating ? `${avgRating} ★` : "—" },
    { label: "Most common mood",        value: topFeelingInfo ? `${topFeelingInfo.emoji} ${topFeelingInfo.label}` : "—" },
    { label: "5-star sessions",         value: fiveStar.toString() },
    { label: "Entries this month",      value: thisMonthCount.toString() },
    { label: "Longest journaling streak", value: `${streak} days` },
  ];

  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #D4CCBF" }}>
      <p className="text-xs font-medium mb-3" style={{ color: "#2C2B29" }}>Your Journal Stats</p>
      <div className="space-y-2">
        {stats.map(s => (
          <div key={s.label} className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid #F0EBE3" }}>
            <span className="text-xs" style={{ color: "#9A9490" }}>{s.label}</span>
            <span className="text-xs font-medium" style={{ color: "#2C2B29" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Practice Tip ─────────────────────────────────────────────────────────────

function PracticeTip() {
  const tip = PRACTICE_TIPS[new Date().getDay() % PRACTICE_TIPS.length];
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(92,107,87,0.08)", border: "1px solid rgba(92,107,87,0.2)" }}>
      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "#5C6B57" }}>Practice Tip</p>
      <p className="text-xs leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>{tip}</p>
    </div>
  );
}

// ─── Recent Entry Card ────────────────────────────────────────────────────────

function RecentEntryCard({ entry, sessionLabel, onDelete }: { entry: JournalEntry; sessionLabel: string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const preview = entry.content.slice(0, 160);
  const needsMore = entry.content.length > 160;
  const feeling = FEELINGS.find(f => f.id === entry.feeling);

  return (
    <motion.div layout className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #E8E1D6" }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold tracking-wider" style={{ color: "#9A9490" }}>{fmtDateShort(entry.createdAt)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#C4BDB5" }}>{sessionLabel} · {fmtTime(entry.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {feeling && <span className="text-base">{feeling.emoji}</span>}
          {entry.rating != null && <StarRating value={entry.rating} readonly />}
          <button onClick={() => { if (confirming) { onDelete(entry.id); } else setConfirming(true); }}
            className="p-1.5 rounded-lg transition-colors ml-1"
            style={{ color: confirming ? "#ef4444" : "#C4BDB5" }}
            title={confirming ? "Confirm delete" : "Delete entry"}>
            <Trash2 size={12} />
          </button>
          {confirming && <button onClick={() => setConfirming(false)} className="text-[10px]" style={{ color: "#C4BDB5" }}>Cancel</button>}
        </div>
      </div>

      {entry.title && entry.title !== todayStr() && (
        <p className="text-sm font-medium mb-1.5" style={{ color: "#2C2B29" }}>{entry.title}</p>
      )}

      <p className="text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300, whiteSpace: "pre-wrap" }}>
        {expanded ? entry.content : preview}
        {!expanded && needsMore ? "…" : ""}
      </p>

      {needsMore && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs mt-2" style={{ color: "#5C6B57" }}>
          {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
        </button>
      )}

      <div className="flex items-center gap-2 mt-3">
        {entry.visibility === "shared"
          ? <span className="flex items-center gap-1 text-[10px]" style={{ color: "#7A8C74" }}><Eye size={10} /> Shared with guide</span>
          : <span className="flex items-center gap-1 text-[10px]" style={{ color: "#C4BDB5" }}><Lock size={10} /> Private</span>}
      </div>
    </motion.div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function JournalPanel() {
  const { user, userProfile } = useAuth();
  const [entries, setEntries]         = useState<JournalEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [enrollment, setEnrollment]   = useState<Enrollment | null>(null);
  const [program, setProgram]         = useState<Program | null>(null);

  // Today's form state
  const [feeling, setFeeling]         = useState<string | null>(null);
  const [rating, setRating]           = useState<number | null>(null);
  const [content, setContent]         = useState("");
  const [visibility, setVisibility]   = useState<"private" | "shared">("private");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [todayEntryId, setTodayEntryId] = useState<string | null>(null);

  // Load entries & enrollment
  useEffect(() => {
    if (!user) return;
    getActiveEnrollment(user.uid).then(e => {
      setEnrollment(e);
      if (e) getProgramById(e.programId).then(setProgram);
    });
    return subscribeJournalEntries(user.uid, list => {
      setEntries(list);
      setLoading(false);
      // Pre-fill today's entry if exists
      const today = list.find(e => e.date === todayStr());
      if (today) {
        setTodayEntryId(today.id);
        setFeeling(today.feeling ?? null);
        setRating(today.rating ?? null);
        setContent(today.content);
        setVisibility(today.visibility);
      }
    });
  }, [user?.uid]);

  const sessionLabel = useMemo(() => {
    const batch = enrollment?.batch ?? "Morning";
    return `${batch} Sadhana`;
  }, [enrollment]);

  const mentorName = program?.mentorName ?? "Guide";

  const handleSave = async () => {
    if (!user || !userProfile || saving || !content.trim()) return;
    setSaving(true);
    const today = todayStr();
    const data = {
      userId: user.uid, userName: userProfile.name,
      programId: userProfile.programId ?? null,
      title: today, content: content.trim(),
      mood: feeling ? (FEELINGS.find(f => f.id === feeling)?.emoji ?? null) : null,
      feeling: feeling ?? null, rating: rating ?? null,
      visibility, date: today,
    };
    if (todayEntryId) {
      await updateJournalEntry(todayEntryId, { content: data.content, mood: data.mood, feeling: data.feeling, rating: data.rating, visibility });
    } else {
      const id = await createJournalEntry(data);
      setTodayEntryId(id);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id: string) => {
    await deleteJournalEntry(id).catch(() => {});
    if (id === todayEntryId) {
      setTodayEntryId(null); setFeeling(null); setRating(null); setContent(""); setVisibility("private");
    }
  };

  const pastEntries = entries.filter(e => e.date !== todayStr());
  const tip = PRACTICE_TIPS[new Date().getDay() % PRACTICE_TIPS.length];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, color: "#2C2B29" }}>
          Practice Journal
        </h1>
        <p className="text-xs mt-1" style={{ color: "#9A9490" }}>
          {fmtDateLong(new Date().toISOString())} · {entries.length} {entries.length === 1 ? "entry" : "entries"} written
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Today's Entry Form */}
          <motion.div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Session info */}
            <p className="text-xs mb-5" style={{ color: "#9A9490" }}>
              {sessionLabel} · with {mentorName}
            </p>

            {/* HOW ARE YOU FEELING? */}
            <div className="mb-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#9A9490" }}>
                How are you feeling?
              </p>
              <div className="grid grid-cols-5 gap-2">
                {FEELINGS.map(f => (
                  <button key={f.id} onClick={() => setFeeling(feeling === f.id ? null : f.id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all"
                    style={{
                      background: feeling === f.id ? "rgba(92,107,87,0.1)" : "#F6F4EF",
                      border: feeling === f.id ? "1.5px solid rgba(92,107,87,0.4)" : "1.5px solid #E8E1D6",
                    }}>
                    <span className="text-2xl">{f.emoji}</span>
                    <span className="text-[10px]" style={{ color: feeling === f.id ? "#5C6B57" : "#9A9490", fontWeight: feeling === f.id ? 600 : 400 }}>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SESSION RATING */}
            <div className="mb-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "#9A9490" }}>
                Session Rating
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Reflection */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="How did today's practice feel? What did you notice? What arose?"
              rows={5}
              className="w-full resize-none outline-none text-sm leading-relaxed rounded-xl p-4"
              style={{ background: "#F6F4EF", border: "1px solid #E8E1D6", color: "#2C2B29", fontWeight: 300 }}
            />

            {/* Footer */}
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setVisibility(v => v === "private" ? "shared" : "private")}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: visibility === "shared" ? "#5C6B57" : "#9A9490" }}>
                {visibility === "shared" ? <><Eye size={12} /> Shared with guide</> : <><Lock size={12} /> Private</>}
              </button>

              <motion.button onClick={handleSave} disabled={!content.trim() || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: content.trim() ? "#5C6B57" : "#D4CCBF", color: "#F6F4EF" }}
                whileTap={{ scale: 0.97 }}>
                {saving ? "Saving…" : saved ? "Saved ✓" : todayEntryId ? "Update Entry" : "Save Entry"}
              </motion.button>
            </div>
          </motion.div>

          {/* Recent Entries */}
          {!loading && pastEntries.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <p className="text-sm font-medium mb-3" style={{ color: "#2C2B29" }}>Recent Entries</p>
              <div className="space-y-3">
                {pastEntries.slice(0, 8).map(entry => (
                  <RecentEntryCard key={entry.id} entry={entry} sessionLabel={sessionLabel} onDelete={handleDelete} />
                ))}
              </div>
            </motion.div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 rounded-full border-2 border-t-transparent" style={{ borderColor: "#5C6B57" }} />
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
          <WeeklyMoodPanel entries={entries} />
          <JournalStatsPanel entries={entries} />
          <PracticeTip />
        </div>
      </div>
    </div>
  );
}
