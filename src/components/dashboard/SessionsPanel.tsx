"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Video, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveEnrollment,
  getSessionsForProgram,
  getAttendanceForUser,
  getRecentMoodLogs,
} from "@/lib/firestore";
import type { Session, Enrollment, Attendance } from "@/types";
import type { MoodLog } from "@/lib/firestore";
import Link from "next/link";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
}

const MOOD_EMOJI: Record<string, string> = {
  Tired: "😴", Neutral: "😐", Good: "🙂", Energised: "✨", Motivated: "🔥",
};

export function SessionsPanel() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [rows, setRows] = useState<{ att: Attendance; session: Session | undefined }[]>([]);
  const [moodByDate, setMoodByDate] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e);
      if (e) {
        const [allSessions, attendance, moodLogs] = await Promise.all([
          getSessionsForProgram(e.programId),
          getAttendanceForUser(user.uid, e.programId, 200),
          getRecentMoodLogs(user.uid, 200),
        ]);

        const sessionMap = new Map(allSessions.map(s => [s.id, s]));
        const presentAtt = attendance
          .filter(a => a.present)
          .sort((a, b) => b.date.localeCompare(a.date));

        setRows(presentAtt.map(a => ({ att: a, session: sessionMap.get(a.sessionId) })));
        setMoodByDate(new Map(moodLogs.map(m => [m.date, m.mood])));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "#D4CCBF", borderTopColor: "#5C6B57" }} />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <Video size={40} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
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

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Session History
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
          {rows.length} session{rows.length !== 1 ? "s" : ""} attended · {enrollment.batch} Batch
        </p>
      </div>

      {rows.length === 0 ? (
        <motion.div
          className="rounded-2xl p-10 text-center"
          style={{ background: "#fff", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle size={36} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
          <p className="text-sm" style={{ color: "#4A4845" }}>No sessions attended yet.</p>
          <p className="text-xs mt-1" style={{ color: "#9A9490" }}>Your completed sessions will appear here.</p>
        </motion.div>
      ) : (
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Table header */}
          <div
            className="hidden md:grid px-5 py-3"
            style={{
              gridTemplateColumns: "1fr 130px 110px 80px 50px",
              background: "#F6F4EF",
              borderBottom: "1px solid #D4CCBF",
            }}
          >
            {["Session", "Guide", "Date", "Duration", "Mood"].map(h => (
              <p key={h} className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "#4A4845" }}>{h}</p>
            ))}
          </div>

          <div className="divide-y" style={{ borderColor: "#F0EBE3" }}>
            {rows.map(({ att, session }, i) => {
              const mood = moodByDate.get(att.date);
              return (
                <motion.div
                  key={att.id}
                  className="px-5 py-4 flex flex-col md:grid gap-1 md:gap-0 md:items-center"
                  style={{ gridTemplateColumns: "1fr 130px 110px 80px 50px" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                >
                  {/* Session name */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#2C2B29" }}>
                      {session?.title ?? "Session"}
                    </p>
                    {/* Mobile: show extra info inline */}
                    <p className="text-xs md:hidden mt-0.5" style={{ color: "#4A4845" }}>
                      {session?.mentorName ?? "—"} · {fmtDate(att.date)}
                      {session && ` · ${fmtDuration(session.startTime, session.endTime)}`}
                      {mood && ` · ${MOOD_EMOJI[mood] ?? mood}`}
                    </p>
                  </div>

                  {/* Guide */}
                  <p className="hidden md:block text-xs truncate" style={{ color: "#4A4845" }}>
                    {session?.mentorName ?? "—"}
                  </p>

                  {/* Date */}
                  <p className="hidden md:block text-xs" style={{ color: "#4A4845" }}>
                    {fmtDate(att.date)}
                  </p>

                  {/* Duration */}
                  <p className="hidden md:block text-xs" style={{ color: "#4A4845" }}>
                    {session ? fmtDuration(session.startTime, session.endTime) : "—"}
                  </p>

                  {/* Mood */}
                  <p className="hidden md:block text-base">
                    {mood ? (MOOD_EMOJI[mood] ?? mood) : <span style={{ color: "#D4CCBF" }}>—</span>}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
