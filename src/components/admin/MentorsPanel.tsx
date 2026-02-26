"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllMentors, getAllUsers, setUserRole, getPrograms } from "@/lib/firestore";
import type { UserProfile, Program } from "@/types";

export function MentorsPanel() {
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"mentors" | "promote">("mentors");

  useEffect(() => {
    Promise.all([getAllMentors(), getAllUsers(100), getPrograms()])
      .then(([m, u, p]) => { setMentors(m); setUsers(u); setPrograms(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleRemoveMentor = async (uid: string) => {
    setSaving(true);
    await setUserRole(uid, "user").catch(() => {});
    setMentors(m => m.filter(x => x.uid !== uid));
    if (selectedMentor?.uid === uid) setSelectedMentor(null);
    setSaving(false);
  };

  const handlePromoteToMentor = async (uid: string) => {
    setSaving(true);
    await setUserRole(uid, "mentor").catch(() => {});
    const promoted = users.find(u => u.uid === uid);
    if (promoted) {
      setMentors(m => [...m, { ...promoted, role: "mentor" }]);
      setUsers(u => u.map(x => x.uid === uid ? { ...x, role: "mentor" } : x));
    }
    setSaving(false);
  };

  const getMentorProgram = (mentorId: string): Program | undefined =>
    programs.find(p => p.mentorId === mentorId);

  const regularUsers = users.filter(u => u.role === "user");
  const filteredUsers = regularUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <motion.h2
          className="text-2xl"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Mentors
        </motion.h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["mentors", "promote"] as const).map(v => (
            <motion.button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase"
              animate={{
                background: view === v ? "rgba(122,140,116,0.3)" : "transparent",
                color: view === v ? "#7A8C74" : "rgba(246,244,239,0.4)",
              }}
            >
              {v === "mentors" ? "Mentors" : "Promote"}
            </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#7A8C74" }}
          />
        </div>
      ) : view === "mentors" ? (
        <div className="space-y-3">
          {mentors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>
                No mentors yet. Use the Promote tab to give a user mentor access.
              </p>
            </div>
          )}
          {mentors.map((mentor, i) => {
            const program = getMentorProgram(mentor.uid);
            const isSelected = selectedMentor?.uid === mentor.uid;
            return (
              <motion.div
                key={mentor.uid}
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${isSelected ? "rgba(122,140,116,0.4)" : "rgba(255,255,255,0.07)"}` }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <motion.div
                  className="p-4 flex items-center gap-4 cursor-pointer"
                  style={{ background: isSelected ? "rgba(122,140,116,0.1)" : "rgba(255,255,255,0.04)" }}
                  onClick={() => setSelectedMentor(isSelected ? null : mentor)}
                  whileHover={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74" }}
                  >
                    {mentor.name?.charAt(0)?.toUpperCase() ?? "M"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "#F6F4EF" }}>{mentor.name}</p>
                    <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{mentor.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {program ? (
                      <span className="text-xs" style={{ color: "#7A8C74" }}>
                        {program.id}-Day · {program.title}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>No program</span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}
                    >
                      mentor
                    </span>
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); handleRemoveMentor(mentor.uid); }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(192,64,64,0.1)", color: "#c04040", border: "1px solid rgba(192,64,64,0.2)" }}
                      whileHover={{ background: "rgba(192,64,64,0.2)" }}
                      disabled={saving}
                    >
                      Remove
                    </motion.button>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="px-5 pb-5"
                      style={{ background: "rgba(122,140,116,0.05)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p className="text-xs tracking-widest uppercase mt-4 mb-3" style={{ color: "#7A8C74" }}>
                        Assigned Program
                      </p>
                      {program ? (
                        <div className="space-y-2">
                          <p className="text-sm" style={{ color: "#F6F4EF" }}>
                            {program.title} ({program.id}-Day)
                          </p>
                          {program.batches.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {program.batches.map(b => (
                                <span
                                  key={b.name}
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.25)" }}
                                >
                                  {b.name} · {b.time}
                                </span>
                              ))}
                            </div>
                          )}
                          {program.levels.length > 0 && (
                            <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                              Levels: {program.levels.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: "rgba(246,244,239,0.3)" }}>
                          No program assigned. Go to the Programs panel to assign this mentor to a program.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Promote tab – make a regular user a mentor */
        <div className="space-y-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }}
          />
          <div className="space-y-2">
            {filteredUsers.map((u, i) => (
              <motion.div
                key={u.uid}
                className="p-4 rounded-xl flex items-center gap-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74" }}
                >
                  {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#F6F4EF" }}>{u.name}</p>
                  <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{u.email}</p>
                </div>
                <motion.button
                  onClick={() => handlePromoteToMentor(u.uid)}
                  className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}
                  whileHover={{ background: "rgba(122,140,116,0.25)" }}
                  disabled={saving}
                >
                  Make Mentor
                </motion.button>
              </motion.div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center py-10 text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>No users found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
