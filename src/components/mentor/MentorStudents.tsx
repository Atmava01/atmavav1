"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getMentorAssignmentSnapshot } from "@/lib/firestore";
import type { Program, Enrollment, UserProfile } from "@/types";

type StudentRow = { enrollment: Enrollment; userProfile: UserProfile };

export function MentorStudents() {
  const { user, userProfile } = useAuth();

  const [program, setProgram]   = useState<Program | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const token = await user!.getIdToken();
        const { program: myProgram, students: rows } = await getMentorAssignmentSnapshot(token);
        if (cancelled) return;
        setProgram(myProgram);
        setStudents(rows);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, userProfile?.name]);

  const batches = program?.batches.map(b => b.name) ?? [];
  const levels  = program?.levels ?? [];

  const filtered = students.filter(row => {
    const s = row.userProfile;
    const e = row.enrollment;
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchBatch = filterBatch === "all" || e.batch === filterBatch;
    const matchLevel = filterLevel === "all" || e.level === filterLevel;
    return matchSearch && matchBatch && matchLevel;
  });

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-baseline justify-between gap-4"
      >
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", color: "#F6F4EF", fontWeight: 300 }}>
          My Students
        </h2>
        {!loading && (
          <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
            {students.length} enrolled
          </p>
        )}
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
      ) : !program ? (
        <motion.div
          className="p-12 rounded-2xl text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "rgba(246,244,239,0.6)", fontWeight: 300 }}>
            No program assigned
          </p>
          <p className="text-sm mt-2" style={{ color: "rgba(246,244,239,0.3)" }}>
            An admin will assign a program to you.
          </p>
        </motion.div>
      ) : students.length === 0 ? (
        <motion.div
          className="p-12 rounded-2xl text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "rgba(246,244,239,0.6)", fontWeight: 300 }}>
            No students yet
          </p>
          <p className="text-sm mt-2" style={{ color: "rgba(246,244,239,0.3)" }}>
            Students will appear here once they enroll in your program.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }}
            />
            {batches.length > 0 && (
              <select
                value={filterBatch}
                onChange={e => setFilterBatch(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(40,38,36,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
              >
                <option value="all">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            {levels.length > 0 && (
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(40,38,36,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}
              >
                <option value="all">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
          </div>

          {/* Student list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: "rgba(246,244,239,0.3)" }}>
                No students match your filter.
              </p>
            ) : filtered.map((row, i) => {
              const s = row.userProfile;
              const e = row.enrollment;
              return (
                <motion.div
                  key={s.uid}
                  className="p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74" }}
                    >
                      {s.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#F6F4EF" }}>{s.name}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(246,244,239,0.4)" }}>{s.email}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {e.batch && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.25)" }}
                        >
                          {e.batch}
                        </span>
                      )}
                      {e.level && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          {e.level}
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "#7A8C74" }}>
                          {e.remainingDays ?? "—"}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>days left</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
