"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllUsers, setUserRole } from "@/lib/firestore";
import type { UserProfile } from "@/types";

const ROLE_COLORS: Record<string, string> = { admin: "#c04040", mentor: "#7A8C74", user: "rgba(246,244,239,0.4)" };

export function UsersPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then(u => { setUsers(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (uid: string, role: UserProfile["role"]) => {
    setSaving(true);
    await setUserRole(uid, role).catch(() => {});
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role } : x));
    if (selectedUser?.uid === uid) setSelectedUser(s => s ? { ...s, role } : s);
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <motion.h2 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          Users
        </motion.h2>
        <motion.span className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {users.length} total
        </motion.span>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }}
        placeholder="Search by name or email…"
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u, i) => (
            <motion.div
              key={u.uid}
              className="p-4 rounded-xl flex items-center gap-4 group"
              style={{ background: selectedUser?.uid === u.uid ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${selectedUser?.uid === u.uid ? "rgba(122,140,116,0.4)" : "rgba(255,255,255,0.07)"}` }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedUser(selectedUser?.uid === u.uid ? null : u)}
              whileHover={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0" style={{ background: u.role === "admin" ? "rgba(192,64,64,0.2)" : "rgba(122,140,116,0.2)", color: u.role === "admin" ? "#c04040" : "#7A8C74" }}>
                {u.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "#F6F4EF" }}>{u.name}</p>
                <p className="text-xs truncate" style={{ color: "rgba(246,244,239,0.4)" }}>{u.email}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: ROLE_COLORS[u.role] }}>{u.role}</span>
                <span className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{u.programId ? `${u.programId}d` : "—"}</span>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>No users found.</p>
            </div>
          )}
        </div>
      )}

      {/* User detail panel */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(122,140,116,0.3)" }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "#F6F4EF", fontWeight: 300 }}>{selectedUser.name}</h3>
                <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#7A8C74" }}>Role</p>
                <div className="flex gap-2">
                  {(["user", "mentor", "admin"] as const).map(r => (
                    <motion.button key={r} className="px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase" style={{ background: selectedUser.role === r ? "#7A8C74" : "rgba(255,255,255,0.06)", color: selectedUser.role === r ? "#F6F4EF" : "rgba(246,244,239,0.4)", border: "1px solid rgba(255,255,255,0.08)" }} onClick={() => handleRoleChange(selectedUser.uid, r)} whileHover={{ background: "rgba(122,140,116,0.3)" }} disabled={saving}>
                      {r}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "#7A8C74" }}>Program</p>
                <p className="text-sm" style={{ color: "#F6F4EF" }}>{selectedUser.programTitle ?? "Not enrolled"}</p>
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "#7A8C74" }}>Progress</p>
                <p className="text-sm" style={{ color: "#F6F4EF" }}>Day {selectedUser.currentDay ?? 1}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
