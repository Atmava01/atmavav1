"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Calendar, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveEnrollment,
  getUpcomingSessionsForBatch,
  getAttendanceForUser,
} from "@/lib/firestore";
import type { Session, Enrollment, Attendance } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
}

export function DashboardOverview() {
  const { userProfile, user } = useAuth();

  const [enrollment, setEnrollment]   = useState<Enrollment | null>(null);
  const [nextSession, setNextSession]  = useState<Session | null>(null);
  const [attendance, setAttendance]   = useState<Attendance[]>([]);
  const [loading, setLoading]         = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const e = await getActiveEnrollment(user!.uid);
        if (cancelled) return;
        setEnrollment(e);

        if (e?.programId && e?.batch) {
          const [sessions, att] = await Promise.all([
            getUpcomingSessionsForBatch(e.programId, e.batch),
            getAttendanceForUser(user!.uid, e.programId, 7),
          ]);
          if (cancelled) return;
          setNextSession(sessions[0] ?? null);
          setAttendance(att);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

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

  const today = new Date().toISOString().split("T")[0];
  const isToday = nextSession?.date === today;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="text-xs md:text-sm mb-1" style={{ color: "#7A7771" }}>Good {greeting}</p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 300, color: "#2C2B29" }}>
          Welcome back, {userProfile?.name?.split(" ")[0] ?? "Yogi"}.
        </h2>
      </motion.div>

      {/* Program stats — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[
          {
            label: "Program",
            value: enrollment ? `${enrollment.programId}-Day` : "—",
            sub: userProfile?.programTitle?.replace(/^\d+ Days? — /, "") ?? "No program",
          },
          {
            label: "Level",
            value: enrollment?.level || "—",
            sub: "your level",
          },
          {
            label: "Batch",
            value: enrollment?.batch || "—",
            sub: "your batch",
          },
          {
            label: "Days Remaining",
            value: enrollment?.remainingDays !== undefined ? String(enrollment.remainingDays) : "—",
            sub: "Mon–Sat classes",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="p-3 md:p-5 rounded-2xl"
            style={{ background: "#E8E1D6", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 * i }}
            whileHover={{ y: -2, borderColor: "#5C6B57", boxShadow: "0 4px 16px rgba(92,107,87,0.1)" }}
          >
            <p className="text-xs tracking-widest uppercase mb-1.5 md:mb-2" style={{ color: "#5C6B57" }}>{stat.label}</p>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: stat.value.length > 8 ? "1rem" : "1.5rem",
              color: "#2C2B29",
              fontWeight: 300,
              display: "block",
              lineHeight: 1.2,
            }}>
              {stat.value}
            </span>
            <p className="text-xs mt-1" style={{ color: "#7A7771" }}>{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Next session */}
      <motion.div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${nextSession ? "#5C6B57" : "#D4CCBF"}` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        <div className="p-4 md:p-6" style={{ background: "#F6F4EF" }}>
          <p className="text-xs tracking-widest uppercase mb-3 md:mb-4" style={{ color: "#5C6B57" }}>
            {isToday ? "Today's Class" : "Next Class"}
          </p>

          {nextSession ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.1rem, 3vw, 1.4rem)", color: "#2C2B29", fontWeight: 400 }}>
                  {nextSession.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} style={{ color: "#7A7771" }} />
                    <span className="text-xs" style={{ color: "#7A7771" }}>{formatDate(nextSession.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: "#7A7771" }} />
                    <span className="text-xs" style={{ color: "#7A7771" }}>
                      {formatTime(nextSession.startTime)} – {formatTime(nextSession.endTime)}
                    </span>
                  </div>
                  {nextSession.mentorName && (
                    <div className="flex items-center gap-1.5">
                      <User size={11} style={{ color: "#7A7771" }} />
                      <span className="text-xs" style={{ color: "#7A7771" }}>{nextSession.mentorName}</span>
                    </div>
                  )}
                </div>
              </div>

              {nextSession.meetLink && (
                <a href={nextSession.meetLink} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                  <motion.button
                    className="flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase"
                    style={{
                      background: "#5C6B57",
                      color: "#F6F4EF",
                      minHeight: "40px",
                    }}
                    whileHover={{ background: "#4A5645", boxShadow: "0 4px 16px rgba(92,107,87,0.25)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ExternalLink size={12} />
                    Join Class
                  </motion.button>
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#7A7771" }}>
              No upcoming sessions scheduled yet. Check back soon.
            </p>
          )}
        </div>
      </motion.div>

      {/* Attendance history */}
      {attendance.length > 0 && (
        <motion.div
          className="p-4 md:p-6 rounded-2xl"
          style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42 }}
        >
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "#5C6B57" }}>Recent Attendance</p>
          <div className="space-y-2">
            {attendance.map((record) => (
              <motion.div
                key={record.id}
                className="flex items-center justify-between py-2 px-3 rounded-xl"
                style={{ background: "#E8E1D6" }}
                whileHover={{ x: 2 }}
              >
                <span className="text-xs md:text-sm" style={{ color: "#2C2B29" }}>
                  {formatDate(record.date)}
                </span>
                <div className="flex items-center gap-1.5">
                  {record.present ? (
                    <>
                      <CheckCircle size={14} style={{ color: "#5C6B57" }} />
                      <span className="text-xs" style={{ color: "#5C6B57" }}>Present</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} style={{ color: "#B08060" }} />
                      <span className="text-xs" style={{ color: "#B08060" }}>Absent</span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
