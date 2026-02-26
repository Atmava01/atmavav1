"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Calendar, Clock, User, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, getUpcomingSessionsForBatch } from "@/lib/firestore";
import type { Session, Enrollment } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

export function SessionsPanel() {
  const { user, userProfile } = useAuth();
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user) return;
    getActiveEnrollment(user.uid)
      .then(async (e) => {
        setEnrollment(e);
        if (e?.programId && e?.batch) {
          const s = await getUpcomingSessionsForBatch(e.programId, e.batch);
          setSessions(s);
        } else if (e?.programId) {
          // fallback: no batch set, show all sessions for program
          const { getUpcomingSessionsForProgram } = await import("@/lib/firestore");
          const s = await getUpcomingSessionsForProgram(e.programId);
          setSessions(s);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, userProfile?.programId]);

  const today = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-7 h-7 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5C6B57" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.4rem, 4vw, 1.9rem)", color: "#2C2B29", fontWeight: 400 }}>
          Live Sessions
        </h2>
        <p className="text-xs md:text-sm mt-1" style={{ color: "#7A7771" }}>
          {enrollment
            ? `${enrollment.programId}-Day Program · ${enrollment.batch || ""} Batch · ${enrollment.level || ""}`
            : userProfile?.programTitle ?? "Your Program"} — Upcoming sessions
        </p>
      </motion.div>

      {!enrollment && !userProfile?.programId ? (
        <motion.div
          className="p-8 rounded-2xl text-center"
          style={{ background: "#E8E1D6", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <Video size={28} className="mx-auto mb-4" style={{ color: "#7A7771" }} />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", color: "#2C2B29" }}>
            No active enrollment
          </p>
          <p className="text-xs md:text-sm mt-2" style={{ color: "#7A7771" }}>
            Enroll in a program to access live sessions.
          </p>
        </motion.div>
      ) : sessions.length === 0 ? (
        <motion.div
          className="p-8 md:p-12 rounded-2xl text-center"
          style={{ background: "#E8E1D6", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ background: "rgba(92,107,87,0.1)", border: "1px solid rgba(92,107,87,0.2)" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Calendar size={20} style={{ color: "#5C6B57" }} />
          </motion.div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "#2C2B29", fontWeight: 300 }}>
            No upcoming sessions
          </p>
          <p className="text-xs md:text-sm mt-2" style={{ color: "#7A7771" }}>
            Your mentor will schedule sessions here. Check back soon.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {sessions.map((session, i) => {
            const isToday = session.date === today;
            return (
              <motion.div
                key={session.id}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${isToday ? "#5C6B57" : "#D4CCBF"}` }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -2, boxShadow: "0 6px 24px rgba(44,43,41,0.08)", borderColor: "#5C6B57" }}
              >
                {/* Green left accent for today's session */}
                <div className="flex">
                  {isToday && (
                    <div className="w-1 flex-shrink-0" style={{ background: "#5C6B57" }} />
                  )}
                  <div className="flex-1 p-4 md:p-5" style={{ background: "#F6F4EF" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {isToday && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs tracking-widest uppercase mb-2"
                            style={{ background: "rgba(92,107,87,0.1)", color: "#5C6B57", border: "1px solid rgba(92,107,87,0.2)" }}
                          >
                            Today
                          </span>
                        )}
                        <h3
                          className="font-medium mb-1"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1rem, 3vw, 1.2rem)", color: "#2C2B29" }}
                        >
                          {session.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} style={{ color: "#7A7771" }} />
                            <span className="text-xs" style={{ color: "#7A7771" }}>{formatDate(session.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} style={{ color: "#7A7771" }} />
                            <span className="text-xs" style={{ color: "#7A7771" }}>
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </span>
                          </div>
                          {session.mentorName && (
                            <div className="flex items-center gap-1.5">
                              <User size={11} style={{ color: "#7A7771" }} />
                              <span className="text-xs" style={{ color: "#7A7771" }}>{session.mentorName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Join button */}
                      <a
                        href={session.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flexShrink: 0 }}
                      >
                        <motion.button
                          className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl text-xs tracking-widest uppercase"
                          style={{
                            background: isToday ? "#5C6B57" : "rgba(92,107,87,0.1)",
                            color: isToday ? "#F6F4EF" : "#5C6B57",
                            border: "1px solid rgba(92,107,87,0.3)",
                            minHeight: "40px",
                          }}
                          whileHover={{ background: "#5C6B57", color: "#F6F4EF", scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <ExternalLink size={11} />
                          <span className="hidden sm:inline">Join</span>
                        </motion.button>
                      </a>
                    </div>
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
