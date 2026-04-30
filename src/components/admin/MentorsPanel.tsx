"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, Search, BookOpen, Users, ChevronRight, UserPlus, X } from "lucide-react";
import { getAllMentors, getAllUsers, setUserRole, getPrograms, getSessionsForProgram } from "@/lib/firestore";
import { SkeletonTable } from "@/components/admin/ui/Skeleton";
import { useToast } from "@/components/admin/ui/Toast";
import { TopBar } from "@/components/admin/ui/TopBar";
import type { UserProfile, Program, Session } from "@/types";

interface MentorStats {
  sessions: number;
  program: Program | undefined;
}

function MentorCard({
  mentor,
  stats,
  onRemove,
  saving,
}: {
  mentor: UserProfile;
  stats: MentorStats;
  onRemove: (uid: string) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }}
      whileHover={{ borderColor: "rgba(122,140,116,0.3)" }}
      transition={{ duration: 0.15 }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-medium flex-shrink-0"
            style={{ background: "rgba(122,140,116,0.2)", color: "#8FA888" }}
          >
            {mentor.name?.charAt(0)?.toUpperCase() ?? "M"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{mentor.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--adm-text-3)" }}>{mentor.email}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(122,140,116,0.14)", color: "#8FA888", border: "1px solid rgba(122,140,116,0.3)" }}>
                Mentor
              </span>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--adm-text-2)" }}>
                <BookOpen size={11} style={{ color: "#7A8C74" }} />
                {stats.program ? (
                  <span>{stats.program.id}-Day · {stats.program.title}</span>
                ) : (
                  <span style={{ color: "var(--adm-text-4)" }}>No program</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--adm-text-2)" }}>
                <Users size={11} style={{ color: "#7A8C74" }} />
                <span>{stats.program?.enrolledCount ?? 0} students</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--adm-elevated)" }}>
          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all flex-1"
            style={{ background: "var(--adm-elevated)", color: "var(--adm-text-2)", border: "1px solid var(--adm-border)" }}
          >
            <ChevronRight size={11} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
            {expanded ? "Less" : "View program"}
          </button>
          <button
            onClick={() => onRemove(mentor.uid)}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(192,64,64,0.1)", color: "#D47070", border: "1px solid rgba(192,64,64,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,64,64,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(192,64,64,0.1)")}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && stats.program && (
          <motion.div
            className="px-5 pb-5 pt-1"
            style={{ background: "rgba(122,140,116,0.05)", borderTop: "1px solid var(--adm-input)" }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
              <div>
                <p style={{ color: "var(--adm-text-3)" }}>Program</p>
                <p className="mt-0.5" style={{ color: "var(--adm-text)" }}>{stats.program.title}</p>
              </div>
              <div>
                <p style={{ color: "var(--adm-text-3)" }}>Duration</p>
                <p className="mt-0.5" style={{ color: "var(--adm-text)" }}>{stats.program.id} days</p>
              </div>
              {stats.program.batches.length > 0 && (
                <div className="col-span-2">
                  <p style={{ color: "var(--adm-text-3)" }}>Batches</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {stats.program.batches.map((b, bi) => (
                      <span key={`${b.name}-${bi}`} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.25)" }}>
                        {b.name} · {b.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stats.program.levels.length > 0 && (
                <div className="col-span-2">
                  <p style={{ color: "var(--adm-text-3)" }}>Levels</p>
                  <p className="mt-0.5" style={{ color: "rgba(246,244,239,0.6)" }}>{stats.program.levels.join(", ")}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function MentorsPanel() {
  const [mentors, setMentors]   = useState<UserProfile[]>([]);
  const [users, setUsers]       = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState("");
  const [view, setView]         = useState<"mentors" | "promote">("mentors");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([getAllMentors(), getAllUsers(200), getPrograms()])
      .then(([m, u, p]) => { setMentors(m); setUsers(u); setPrograms(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getMentorStats = (mentorId: string): MentorStats => ({
    sessions: 0,
    program: programs.find(p => p.mentorId === mentorId),
  });

  const handleRemove = async (uid: string) => {
    setSaving(true);
    await setUserRole(uid, "user").catch(() => {});
    setMentors(m => m.filter(x => x.uid !== uid));
    toast("Mentor removed");
    setSaving(false);
  };

  const handlePromote = async (uid: string) => {
    setSaving(true);
    await setUserRole(uid, "mentor").catch(() => {});
    const promoted = users.find(u => u.uid === uid);
    if (promoted) {
      setMentors(m => [...m, { ...promoted, role: "mentor" }]);
      setUsers(u => u.map(x => x.uid === uid ? { ...x, role: "mentor" } : x));
    }
    toast("User promoted to mentor");
    setSaving(false);
  };

  const regularUsers = users.filter(u => u.role === "user");
  const filteredUsers = regularUsers.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Mentors"
        subtitle={`${mentors.length} mentors · ${regularUsers.length} users eligible`}
        onOpenPalette={() => {}}
      />

      <div className="px-6 md:px-10 py-6 space-y-5 max-w-5xl">

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--adm-elevated)" }}>
          {(["mentors", "promote"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-2 rounded-lg text-xs capitalize transition-all"
              style={{
                background: view === v ? "rgba(122,140,116,0.2)" : "transparent",
                color:      view === v ? "#8FA888"               : "rgba(246,244,239,0.4)",
              }}
            >
              {v === "mentors" ? `Mentors (${mentors.length})` : "Promote User"}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonTable rows={4} />
        ) : (
          <AnimatePresence mode="wait">

            {/* ── Mentor cards ── */}
            {view === "mentors" && (
              <motion.div key="mentors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {mentors.length === 0 ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
                      <UserCheck size={20} style={{ color: "var(--adm-text-4)" }} />
                    </div>
                    <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No mentors yet</p>
                    <button onClick={() => setView("promote")} className="text-xs" style={{ color: "#7A8C74" }}>
                      Promote a user →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentors.map((mentor, i) => (
                      <motion.div key={mentor.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <MentorCard
                          mentor={mentor}
                          stats={getMentorStats(mentor.uid)}
                          onRemove={handleRemove}
                          saving={saving}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Promote tab ── */}
            {view === "promote" && (
              <motion.div key="promote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="relative max-w-sm">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-3)" }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
                  />
                </div>

                {filteredUsers.length === 0 ? (
                  <p className="text-center py-12 text-sm" style={{ color: "var(--adm-text-3)" }}>No users found.</p>
                ) : (
                  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--adm-border)" }}>
                    <table className="admin-table" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th className="hidden md:table-cell">Email</th>
                          <th className="hidden sm:table-cell">Program</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.slice(0, 50).map((u, i) => (
                          <motion.tr key={u.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74" }}>
                                  {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                                </div>
                                <span style={{ color: "var(--adm-text)" }}>{u.name}</span>
                              </div>
                            </td>
                            <td className="hidden md:table-cell" style={{ color: "var(--adm-text-2)" }}>{u.email}</td>
                            <td className="hidden sm:table-cell" style={{ color: "var(--adm-text-3)" }}>
                              {u.programTitle ?? "—"}
                            </td>
                            <td>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handlePromote(u.uid)}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                                  style={{ background: "rgba(122,140,116,0.14)", color: "#8FA888", border: "1px solid rgba(122,140,116,0.3)" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(122,140,116,0.25)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(122,140,116,0.14)")}
                                >
                                  <UserPlus size={11} /> Promote
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
