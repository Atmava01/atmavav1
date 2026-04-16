"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, AlertCircle, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, getSessionsForProgram, getAttendanceForUser } from "@/lib/firestore";
import type { Enrollment, Session, Attendance } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return `${(eh * 60 + em) - (sh * 60 + sm)} min`;
}

function groupByWeek(sessions: Session[]): { label: string; sessions: Session[] }[] {
  const groups = new Map<string, Session[]>();

  for (const s of sessions) {
    const d = new Date(s.date + "T00:00:00");
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const label = `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
    const key = monday.toISOString().split("T")[0];

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, sessions]) => {
      const d = new Date(sessions[0].date + "T00:00:00");
      const dow = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        label: `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        sessions: sessions.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
      };
    });
}

export function SchedulePanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e);
      if (e) {
        const today = new Date().toISOString().split("T")[0];
        const [allSessions, attendance] = await Promise.all([
          getSessionsForProgram(e.programId),
          getAttendanceForUser(user.uid, e.programId, 200),
        ]);
        const upcoming = allSessions
          .filter(s => s.date >= today && (s.batch === e.batch || !s.batch))
          .slice(0, 60);
        setSessions(upcoming);
        setAttendedDates(new Set(attendance.filter(a => a.present).map(a => a.date)));
      }
      setLoading(false);
    })();
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

  const today = new Date().toISOString().split("T")[0];
  const weeks = groupByWeek(sessions);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Schedule
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
          Upcoming sessions · {enrollment.batch} Batch
        </p>
      </div>

      {weeks.length === 0 ? (
        <motion.div
          className="rounded-2xl p-8 text-center"
          style={{ background: "#fff", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CalendarDays size={36} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
          <p className="text-sm" style={{ color: "#4A4845" }}>No upcoming sessions found.</p>
        </motion.div>
      ) : (
        weeks.map((week, wi) => (
          <motion.div
            key={week.label}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: wi * 0.06 }}
          >
            <div className="px-5 py-3" style={{ background: "#F6F4EF", borderBottom: "1px solid #D4CCBF" }}>
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: "#5C6B57" }}>
                {week.label}
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "#F0EBE3" }}>
              {week.sessions.map((s) => {
                const isToday = s.date === today;
                const attended = attendedDates.has(s.date);
                const d = new Date(s.date + "T00:00:00");

                return (
                  <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 text-center w-9">
                        <p className="text-xs" style={{ color: "#9A9490" }}>
                          {d.toLocaleDateString("en-IN", { weekday: "short" })}
                        </p>
                        <p className="text-base font-medium" style={{ color: isToday ? "#5C6B57" : "#2C2B29" }}>
                          {d.getDate()}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm" style={{ color: "#2C2B29" }}>{s.title}</p>
                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.12)", color: "#5C6B57" }}>
                              Today
                            </span>
                          )}
                          {attended && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.08)", color: "#7A8C74" }}>
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>
                          {fmtTime(s.startTime)} · {fmtDuration(s.startTime, s.endTime)} · {s.mentorName}
                        </p>
                      </div>
                    </div>
                    {isToday && (
                        <motion.button
                          onClick={() => router.push(`/session/${s.id}`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0"
                          style={{ background: "#5C6B57", color: "#F6F4EF" }}
                          whileHover={{ background: "#4A5845" }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Video size={11} />
                          Join
                        </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
