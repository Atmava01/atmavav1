"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CheckCircle, XCircle, CalendarClock, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getEnrollmentsAdmin, getAllUsers, getPrograms } from "@/lib/firestore";
import type { Enrollment, UserProfile, Program } from "@/types";


function statusBadge(status: string) {
  const active = status === "active";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: active ? "rgba(92,107,87,0.15)" : "rgba(122,119,113,0.15)",
        color: active ? "#5C6B57" : "#7A7771",
        border: `1px solid ${active ? "rgba(92,107,87,0.3)" : "rgba(122,119,113,0.3)"}`,
      }}
    >
      {active ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {active ? "Active" : "Expired"}
    </span>
  );
}

export function EnrollmentsPanel() {
  const { user } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers]             = useState<UserProfile[]>([]);
  const [loading, setLoading]         = useState(true);

  const [programs, setPrograms] = useState<Program[]>([]);

  // Grant form state
  const [grantUserId, setGrantUserId]   = useState("");
  const [grantProgram, setGrantProgram] = useState("30");
  const [grantLevel, setGrantLevel]     = useState("");
  const [grantBatch, setGrantBatch]     = useState("");
  const [grantStart, setGrantStart]     = useState("");
  const [granting, setGranting]         = useState(false);
  const [grantError, setGrantError]     = useState("");
  const [grantSuccess, setGrantSuccess] = useState("");
  const [userSearch, setUserSearch]     = useState("");

  // Extend state
  const [extendId, setExtendId]       = useState<string | null>(null);
  const [extendDate, setExtendDate]   = useState("");
  const [extendBusy, setExtendBusy]   = useState(false);

  // Action feedback
  const [actionMsg, setActionMsg]     = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [e, u, p] = await Promise.all([getEnrollmentsAdmin(200), getAllUsers(200), getPrograms()]);
    setEnrollments(e);
    setUsers(u);
    setPrograms(p.sort((a, b) => Number(a.duration) - Number(b.duration)));
    // Default the grant dropdown to the first available program
    if (p.length > 0) setGrantProgram(p.sort((a, b) => Number(a.duration) - Number(b.duration))[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getUserName = (uid: string) =>
    users.find(u => u.uid === uid)?.name ?? uid.slice(0, 8) + "…";
  const getUserEmail = (uid: string) =>
    users.find(u => u.uid === uid)?.email ?? "";

  const filteredUsers = users.filter(u =>
    u.role === "user" &&
    (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleGrant = async () => {
    if (!grantUserId || !grantProgram) {
      setGrantError("Select a user and program.");
      return;
    }
    setGranting(true);
    setGrantError("");
    setGrantSuccess("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/admin/grant-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          userId:    grantUserId,
          programId: grantProgram,
          level:     grantLevel,
          batch:     grantBatch,
          ...(grantStart ? { startDate: grantStart } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to grant enrollment.");
      setGrantSuccess(`Access granted! Enrollment ID: ${data.enrollmentId}`);
      setGrantUserId(""); setGrantProgram("30"); setGrantLevel(""); setGrantBatch(""); setGrantStart(""); setUserSearch("");
      await loadData();
    } catch (e) {
      setGrantError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (enrollmentId: string) => {
    if (!confirm("Revoke this enrollment? The user will lose access immediately.")) return;
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setActionMsg("Enrollment revoked.");
      await loadData();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to revoke.");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleExtend = async () => {
    if (!extendId || !extendDate) return;
    setExtendBusy(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch(`/api/admin/enrollments/${extendId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ action: "extend", newEndDate: extendDate }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setActionMsg("Enrollment extended.");
      setExtendId(null); setExtendDate("");
      await loadData();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to extend.");
    } finally {
      setExtendBusy(false);
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    color: "#F6F4EF",
    padding: "8px 12px",
    fontSize: "0.8rem",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 5vw, 2.4rem)", color: "#F6F4EF", fontWeight: 300 }}>
          Enrollments
        </h1>
        <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.4)" }}>
          Grant access, revoke, and extend enrollments
        </p>
      </motion.div>

      {/* Action feedback toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            className="p-3 rounded-xl flex items-center gap-2"
            style={{ background: "rgba(92,107,87,0.15)", border: "1px solid rgba(92,107,87,0.3)" }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          >
            <CheckCircle size={14} style={{ color: "#7A8C74" }} />
            <span className="text-sm" style={{ color: "#7A8C74" }}>{actionMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grant Access Form ────────────────────────────────────────────────── */}
      <motion.div
        className="p-4 md:p-6 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={15} style={{ color: "#7A8C74" }} />
          <h2 className="text-sm tracking-widest uppercase" style={{ color: "#7A8C74" }}>Grant Access</h2>
        </div>

        <div className="space-y-3">
          {/* User search */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "rgba(246,244,239,0.5)" }}>Search User</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(246,244,239,0.3)" }} />
              <input
                placeholder="Name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "32px" }}
              />
            </div>
            {userSearch && filteredUsers.length > 0 && (
              <div
                className="mt-1 rounded-xl overflow-hidden max-h-40 overflow-y-auto"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#2C2B29" }}
              >
                {filteredUsers.slice(0, 8).map(u => (
                  <button
                    key={u.uid}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                    style={{
                      background: grantUserId === u.uid ? "rgba(92,107,87,0.15)" : "transparent",
                      color: "#F6F4EF",
                    }}
                    onClick={() => { setGrantUserId(u.uid); setUserSearch(u.name ?? u.email ?? ""); }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: "#5C6B57", color: "#F6F4EF" }}>
                      {(u.name ?? "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{u.name}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(246,244,239,0.4)" }}>{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Program select */}
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "rgba(246,244,239,0.5)" }}>Program</label>
              <select
                value={grantProgram}
                onChange={e => { setGrantProgram(e.target.value); setGrantLevel(""); setGrantBatch(""); }}
                style={inputStyle}
              >
                {programs.length > 0
                  ? programs.map(p => (
                      <option key={p.id} value={p.id} style={{ background: "#2C2B29" }}>
                        {p.title ? `${p.title} (${p.duration} days)` : `${p.duration}-Day Program`}
                      </option>
                    ))
                  : <option disabled>Loading programs…</option>
                }
              </select>
            </div>

            {/* Optional start date */}
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "rgba(246,244,239,0.5)" }}>Start Date (optional)</label>
              <input
                type="date"
                value={grantStart}
                onChange={e => setGrantStart(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Level — populated from selected program */}
            {(() => {
              const prog = programs.find(p => p.id === grantProgram);
              return prog?.levels && prog.levels.length > 0 ? (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: "rgba(246,244,239,0.5)" }}>Level</label>
                  <select value={grantLevel} onChange={e => setGrantLevel(e.target.value)} style={inputStyle}>
                    <option value="" style={{ background: "#2C2B29" }}>Select level…</option>
                    {prog.levels.map(l => (
                      <option key={l} value={l} style={{ background: "#2C2B29" }}>{l}</option>
                    ))}
                  </select>
                </div>
              ) : null;
            })()}

            {/* Batch — populated from selected program */}
            {(() => {
              const prog = programs.find(p => p.id === grantProgram);
              return prog?.batches && prog.batches.length > 0 ? (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: "rgba(246,244,239,0.5)" }}>Batch</label>
                  <select value={grantBatch} onChange={e => setGrantBatch(e.target.value)} style={inputStyle}>
                    <option value="" style={{ background: "#2C2B29" }}>Select batch…</option>
                    {prog.batches.map(b => (
                      <option key={b.name} value={b.name} style={{ background: "#2C2B29" }}>{b.name} · {b.time}</option>
                    ))}
                  </select>
                </div>
              ) : null;
            })()}
          </div>

          {/* Error / Success */}
          <AnimatePresence>
            {grantError && (
              <motion.p className="text-xs flex items-center gap-1.5" style={{ color: "#e05c5c" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AlertCircle size={12} />{grantError}
              </motion.p>
            )}
            {grantSuccess && (
              <motion.p className="text-xs flex items-center gap-1.5" style={{ color: "#7A8C74" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CheckCircle size={12} />{grantSuccess}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleGrant}
            disabled={granting || !grantUserId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase"
            style={{
              background: granting || !grantUserId ? "rgba(255,255,255,0.06)" : "#5C6B57",
              color: granting || !grantUserId ? "rgba(246,244,239,0.3)" : "#F6F4EF",
              minHeight: "44px",
            }}
            whileHover={!granting && grantUserId ? { background: "#4A5645" } : {}}
            whileTap={!granting && grantUserId ? { scale: 0.97 } : {}}
          >
            {granting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent" style={{ borderColor: "rgba(246,244,239,0.5)" }} />
            ) : (
              <UserPlus size={13} />
            )}
            {granting ? "Granting…" : "Grant Access"}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Enrollments List ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.5)" }}>
            All Enrollments ({enrollments.length})
          </h2>
          <motion.button onClick={loadData} whileHover={{ opacity: 0.7 }} whileTap={{ scale: 0.95 }}>
            <RefreshCw size={14} style={{ color: "rgba(246,244,239,0.4)" }} />
          </motion.button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-6 h-6 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
          </div>
        ) : enrollments.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "rgba(246,244,239,0.3)" }}>No enrollments yet.</p>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {enrollments.map((e, i) => (
              <motion.div
                key={e.id}
                className="p-3 md:p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ borderColor: "rgba(122,140,116,0.3)" }}
              >
                {/* Mobile card layout */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>{getUserName(e.userId)}</p>
                      {statusBadge(e.status)}
                      {e.grantedByAdmin && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,170,80,0.15)", color: "#d4aa50", border: "1px solid rgba(212,170,80,0.3)" }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "rgba(246,244,239,0.35)" }}>{getUserEmail(e.userId)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                      <span>{e.programId}-Day Program</span>
                      {e.level && <span>{e.level}</span>}
                      {e.batch && <span>{e.batch} batch</span>}
                      {e.remainingDays !== undefined && <span>{e.remainingDays}d remaining</span>}
                      <span>{e.startDate} → {e.endDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {e.status === "active" && (
                      <>
                        {extendId === e.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={extendDate}
                              onChange={ev => setExtendDate(ev.target.value)}
                              className="text-xs rounded-lg px-2 py-1.5"
                              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#F6F4EF", minHeight: "36px" }}
                            />
                            <motion.button
                              onClick={handleExtend}
                              disabled={extendBusy}
                              className="px-2.5 py-1.5 rounded-lg text-xs"
                              style={{ background: "#5C6B57", color: "#F6F4EF", minHeight: "36px" }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Save
                            </motion.button>
                            <motion.button
                              onClick={() => { setExtendId(null); setExtendDate(""); }}
                              className="p-1.5 rounded-lg text-xs"
                              style={{ color: "rgba(246,244,239,0.4)" }}
                            >
                              ✕
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            onClick={() => { setExtendId(e.id); setExtendDate(e.endDate); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                            style={{ background: "rgba(92,107,87,0.15)", color: "#7A8C74", border: "1px solid rgba(92,107,87,0.25)", minHeight: "36px" }}
                            whileHover={{ background: "rgba(92,107,87,0.25)" }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <CalendarClock size={11} /> Extend
                          </motion.button>
                        )}
                        <motion.button
                          onClick={() => handleRevoke(e.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs"
                          style={{ background: "rgba(192,64,64,0.1)", color: "#c04040", border: "1px solid rgba(192,64,64,0.2)", minHeight: "36px" }}
                          whileHover={{ background: "rgba(192,64,64,0.2)" }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <XCircle size={11} /> Revoke
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
