"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Video, AlertCircle, CheckCircle, History, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, subscribeTodaySessionsForProgram, getAttendanceForUser } from "@/lib/firestore";
import { openSessionLaunch } from "@/lib/sessionLinks";
import { filterSessionsForEnrollment, getEnrollmentBatchLabel } from "@/lib/studentSessions";
import type { Enrollment, Session } from "@/types";
import Link from "next/link";

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ap}`;
}

function fmtDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
}

function isLive(s: Session) {
  const today = new Date().toISOString().split("T")[0];
  if (s.date !== today) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  const [eh, em] = s.endTime.split(":").map(Number);
  return now >= sh * 60 + sm && now <= eh * 60 + em;
}

function isAwaiting(s: Session) {
  const today = new Date().toISOString().split("T")[0];
  if (s.date !== today) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  return now < sh * 60 + sm;
}

function minsUntil(s: Session) {
  const [sh, sm] = s.startTime.split(":").map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return (sh * 60 + sm) - now;
}

function minsLeft(s: Session) {
  const [eh, em] = s.endTime.split(":").map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return Math.max(0, (eh * 60 + em) - now);
}

function isPast(s: Session) {
  const today = new Date().toISOString().split("T")[0];
  if (s.date < today) return true;
  if (s.date > today) return false;
  const [eh, em] = s.endTime.split(":").map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return now > eh * 60 + em;
}

export function TodayPanel() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(new Date());

  // Refresh every 10s to update live/awaiting state without relying solely on real-time
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    let unsubSessions: (() => void) | null = null;

    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e);
      if (e) {
        const [attendance] = await Promise.all([
          getAttendanceForUser(user.uid, e.programId, 200),
        ]);
        const today = new Date().toISOString().split("T")[0];
        const ids = new Set(
          attendance.filter(a => a.date === today && a.present).map(a => a.sessionId)
        );
        setAttendedIds(ids);

        // Real-time listener so newly created sessions appear without refresh
        unsubSessions = subscribeTodaySessionsForProgram(e.programId, (allSessions) => {
          const filtered = filterSessionsForEnrollment(allSessions, e);
          setSessions(filtered);
        });
      }
      setLoading(false);
    })();

    return () => { unsubSessions?.(); };
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

  const liveSession = sessions.find(s => isLive(s));
  const batchLabel = getEnrollmentBatchLabel(enrollment, sessions);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Today&rsquo;s Class
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          {" · "}{batchLabel} Batch
        </p>
      </div>

      {/* Live Banner */}
      <AnimatePresence>
        {liveSession && (
          <motion.div
            className="rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ background: "#1E1D1B" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <motion.span
                  className="w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-xs font-bold text-red-400 tracking-widest">LIVE NOW</span>
              </div>
              <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{liveSession.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.5)" }}>
                {minsLeft(liveSession)} min remaining · {liveSession.mentorName}
              </p>
            </div>
            <motion.button
              onClick={() => openSessionLaunch(liveSession.id, liveSession.meetLink)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ background: "#dc2626", color: "#fff" }}
              whileHover={{ background: "#b91c1c" }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={12} fill="currentColor" />
              Join Class
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No sessions today */}
      {sessions.length === 0 ? (
        <motion.div
          className="rounded-2xl p-8 text-center"
          style={{ background: "#fff", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Clock size={36} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
          <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>No sessions today</p>
          <p className="text-xs mt-1 mb-5" style={{ color: "#9A9490" }}>
            Your next class isn&apos;t scheduled yet. Check back soon.
          </p>
          <Link href="/dashboard/sessions">
            <motion.button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm mx-auto"
              style={{ background: "#F6F4EF", color: "#2C2B29", border: "1px solid #D4CCBF" }}
              whileHover={{ background: "#EDE8E0" }}
              whileTap={{ scale: 0.97 }}
            >
              <History size={14} />
              View Session History
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const live      = isLive(s);
            const awaiting  = isAwaiting(s);
            const past      = isPast(s);
            const attended  = attendedIds.has(s.id);
            const until     = awaiting ? minsUntil(s) : 0;

            return (
              <motion.div
                key={s.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "#fff",
                  border: `1px solid ${live ? "#dc2626" : awaiting ? "rgba(92,107,87,0.4)" : "#D4CCBF"}`,
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                {/* LIVE top strip */}
                {live && (
                  <div
                    className="flex items-center gap-2 px-4 py-2"
                    style={{ background: "rgba(220,38,38,0.08)", borderBottom: "1px solid rgba(220,38,38,0.15)" }}
                  >
                    <motion.span
                      className="w-2 h-2 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-xs font-bold text-red-500 tracking-widest">LIVE</span>
                    <span className="text-xs" style={{ color: "#4A4845" }}>· {minsLeft(s)} min remaining</span>
                  </div>
                )}

                {/* AWAITING top strip */}
                {awaiting && (
                  <div
                    className="flex items-center gap-2 px-4 py-2"
                    style={{ background: "rgba(92,107,87,0.06)", borderBottom: "1px solid rgba(92,107,87,0.15)" }}
                  >
                    <motion.span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#7A8C74" }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-semibold tracking-widest" style={{ color: "#5C6B57" }}>AWAITING</span>
                    {until > 0 && (
                      <span className="text-xs" style={{ color: "#4A4845" }}>
                        · starts in {until < 60 ? `${until}m` : `${Math.floor(until / 60)}h ${until % 60}m`}
                      </span>
                    )}
                  </div>
                )}

                {/* Card body */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "#2C2B29" }}>{s.title}</span>
                      {attended && !live && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.12)", color: "#5C6B57" }}>
                          <CheckCircle size={10} /> Attended
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "#4A4845" }}>
                      {fmtTime(s.startTime)} – {fmtTime(s.endTime)} · {fmtDuration(s.startTime, s.endTime)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9A9490" }}>{s.mentorName}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {live ? (
                      <motion.button
                        onClick={() => openSessionLaunch(s.id, s.meetLink)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold"
                        style={{ background: "#dc2626", color: "#fff" }}
                        whileHover={{ background: "#b91c1c" }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ boxShadow: ["0 0 0 0 rgba(220,38,38,0.4)", "0 0 0 8px rgba(220,38,38,0)", "0 0 0 0 rgba(220,38,38,0)"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Play size={12} fill="currentColor" />
                        Join
                      </motion.button>
                    ) : awaiting ? (
                      <motion.button
                        onClick={() => openSessionLaunch(s.id, s.meetLink)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs"
                        style={{ background: "#F6F4EF", color: "#4A4845", border: "1px solid #D4CCBF" }}
                        whileHover={{ background: "#EDE8E0" }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Video size={11} />
                        Enter Room
                      </motion.button>
                    ) : past ? (
                      <div className="px-3 py-2 rounded-xl text-xs" style={{ color: "#9A9490" }}>
                        {attended ? "Attended" : "Missed"}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
