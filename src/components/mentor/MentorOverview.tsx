"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPrograms, getStudentsForProgram, getSessionsByMentor } from "@/lib/firestore";
import type { Program, Session } from "@/types";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${ampm}`;
}

export function MentorOverview() {
  const { user, userProfile } = useAuth();

  const [program, setProgram]           = useState<Program | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [loading, setLoading]           = useState(true);
  const [copied, setCopied]             = useState<string | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [programs, sessions] = await Promise.all([
          getPrograms(),
          getSessionsByMentor(user!.uid),
        ]);
        if (cancelled) return;

        const myProgram = programs.find(p => p.mentorId === user!.uid) ?? null;
        setProgram(myProgram);

        const todayS = sessions.filter(s => s.date === today);
        setTodaySessions(todayS);

        if (myProgram) {
          const students = await getStudentsForProgram(myProgram.id);
          if (!cancelled) setStudentCount(students.length);
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

  const copyLink = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statCards = [
    {
      label: "My Program",
      value: program ? `${program.id}-Day` : "—",
      sub: program?.title ?? "No program assigned",
    },
    {
      label: "Students",
      value: String(studentCount),
      sub: "enrolled in your program",
    },
    {
      label: "Today's Sessions",
      value: String(todaySessions.length),
      sub: "scheduled today",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>
          Good {greeting}
        </p>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", color: "#F6F4EF", fontWeight: 300 }}>
          {userProfile?.name?.split(" ")[0] ?? "Mentor"}.
        </h2>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#7A8C74" }}
          />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                className="p-4 md:p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ background: "rgba(255,255,255,0.08)" }}
              >
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "#7A8C74" }}>{s.label}</p>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>{s.value}</span>
                <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.4)" }}>{s.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Today's sessions */}
          {todaySessions.length > 0 && (
            <motion.div
              className="p-5 md:p-6 rounded-2xl"
              style={{ background: "rgba(122,140,116,0.08)", border: "1px solid rgba(122,140,116,0.25)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "#7A8C74" }}>Today's Sessions</p>
              <div className="space-y-3">
                {todaySessions.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 md:p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div>
                      <p className="text-sm" style={{ color: "#F6F4EF" }}>{s.title}</p>
                      <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                        {s.batch ? ` · ${s.batch} Batch` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => copyLink(s.meetLink, s.id)}
                        className="p-2 rounded-lg text-xs"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                        title="Copy meet link"
                        whileHover={{ background: "rgba(255,255,255,0.12)" }}
                        whileTap={{ scale: 0.92 }}
                      >
                        {copied === s.id
                          ? <span style={{ color: "#7A8C74", fontSize: "10px" }}>✓</span>
                          : <Copy size={12} />}
                      </motion.button>
                      <a href={s.meetLink} target="_blank" rel="noopener noreferrer">
                        <motion.button
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs tracking-widest uppercase"
                          style={{ background: "#7A8C74", color: "#F6F4EF", minHeight: "36px" }}
                          whileHover={{ background: "#6a7c64" }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <ExternalLink size={11} />
                          Join
                        </motion.button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No program state */}
          {!program && (
            <motion.div
              className="p-10 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "rgba(246,244,239,0.6)", fontWeight: 300 }}>
                No program assigned yet
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(246,244,239,0.3)" }}>
                An admin will assign a program to you. Check back soon.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
