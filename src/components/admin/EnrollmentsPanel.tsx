"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CheckCircle, XCircle, CalendarClock, RefreshCw, AlertCircle, Search, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getEnrollmentsAdmin, getAllUsers, getPrograms } from "@/lib/firestore";
import { SkeletonTable } from "@/components/admin/ui/Skeleton";
import { useToast } from "@/components/admin/ui/Toast";
import { TopBar } from "@/components/admin/ui/TopBar";
import type { Enrollment, UserProfile, Program } from "@/types";

type StatusFilter = "all" | "active" | "expired";

const inputStyle: React.CSSProperties = {
  background: "var(--adm-input)",
  border: "1px solid var(--adm-elevated)",
  borderRadius: "10px",
  color: "var(--adm-text)",
  padding: "8px 12px",
  fontSize: "0.82rem",
  outline: "none",
  width: "100%",
};

function StatusBadge({ status, endDate }: { status: string; endDate: string }) {
  const isActive = status === "active" && endDate >= new Date().toISOString().split("T")[0];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        background: isActive ? "rgba(92,107,87,0.15)" : "var(--adm-input)",
        color: isActive ? "#8FA888" : "rgba(246,244,239,0.35)",
        border: `1px solid ${isActive ? "rgba(92,107,87,0.35)" : "var(--adm-input-border)"}`,
      }}
    >
      {isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {isActive ? "Active" : "Expired"}
    </span>
  );
}

export function EnrollmentsPanel() {
  const { user } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers]             = useState<UserProfile[]>([]);
  const [programs, setPrograms]       = useState<Program[]>([]);
  const [loading, setLoading]         = useState(true);

  // Grant form
  const [grantUserId, setGrantUserId]   = useState("");
  const [grantProgram, setGrantProgram] = useState("");
  const [grantLevel, setGrantLevel]     = useState("");
  const [grantBatch, setGrantBatch]     = useState("");
  const [grantStart, setGrantStart]     = useState("");
  const [granting, setGranting]         = useState(false);
  const [grantError, setGrantError]     = useState("");
  const [userSearch, setUserSearch]     = useState("");

  // Filters
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [tableSearch, setTableSearch]     = useState("");

  // Extend
  const [extendId, setExtendId]   = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendBusy, setExtendBusy] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [e, u, p] = await Promise.all([getEnrollmentsAdmin(200), getAllUsers(200), getPrograms()]);
    setEnrollments(e);
    setUsers(u);
    const sorted = p.sort((a, b) => Number(a.duration) - Number(b.duration));
    setPrograms(sorted);
    if (sorted.length > 0) setGrantProgram(sorted[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const userMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);

  const filteredUsers = users.filter(u =>
    u.role === "user" &&
    (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredEnrollments = useMemo(() => {
    let list = enrollments;
    if (statusFilter === "active")  list = list.filter(e => e.status === "active" && e.endDate > new Date().toISOString());
    if (statusFilter === "expired") list = list.filter(e => e.status !== "active" || e.endDate <= new Date().toISOString());
    if (programFilter !== "all")    list = list.filter(e => e.programId === programFilter);
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      list = list.filter(e => {
        const u = userMap.get(e.userId);
        return u?.name?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q);
      });
    }
    return list;
  }, [enrollments, statusFilter, programFilter, tableSearch, userMap]);

  const handleGrant = async () => {
    if (!grantUserId || !grantProgram) { setGrantError("Select a user and program."); return; }
    setGranting(true);
    setGrantError("");
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/admin/grant-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ userId: grantUserId, programId: grantProgram, level: grantLevel, batch: grantBatch, ...(grantStart ? { startDate: grantStart } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to grant enrollment.");
      toast("Access granted successfully");
      setGrantUserId(""); setGrantLevel(""); setGrantBatch(""); setGrantStart(""); setUserSearch("");
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
      toast("Enrollment revoked");
      await loadData();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to revoke.", "error");
    }
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
      toast("Enrollment extended");
      setExtendId(null); setExtendDate("");
      await loadData();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to extend.", "error");
    } finally {
      setExtendBusy(false);
    }
  };

  const todayDate = new Date().toISOString().split("T")[0];
  const activeCount = enrollments.filter(e => e.status === "active" && e.endDate >= todayDate).length;

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Enrollments"
        subtitle={`${enrollments.length} total · ${activeCount} active`}
        onOpenPalette={() => {}}
        actions={
          <button onClick={loadData} className="p-2 rounded-lg" style={{ color: "var(--adm-text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <RefreshCw size={14} />
          </button>
        }
      />

      <div className="px-6 md:px-10 py-6 space-y-6 max-w-5xl">

        {/* ── Grant Access Form ─────────────────────────────────────── */}
        <motion.div
          className="p-5 rounded-2xl"
          style={{ background: "var(--adm-card)", border: "1px solid var(--adm-input-border)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={14} style={{ color: "#7A8C74" }} />
            <h2 className="text-xs tracking-widest uppercase" style={{ color: "#7A8C74" }}>Grant Access</h2>
          </div>

          <div className="space-y-3">
            {/* User search */}
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: "var(--adm-text-2)" }}>User</label>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-3)" }} />
                <input
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: "30px" }}
                />
              </div>
              <AnimatePresence>
                {userSearch && filteredUsers.length > 0 && (
                  <motion.div
                    className="mt-1 rounded-xl overflow-hidden max-h-44 overflow-y-auto admin-scroll"
                    style={{ border: "1px solid var(--adm-elevated)", background: "#1C1B19" }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {filteredUsers.slice(0, 8).map(u => (
                      <button
                        key={u.uid}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                        style={{ background: grantUserId === u.uid ? "rgba(92,107,87,0.15)" : "transparent" }}
                        onMouseEnter={e => { if (grantUserId !== u.uid) e.currentTarget.style.background = "var(--adm-elevated)"; }}
                        onMouseLeave={e => { if (grantUserId !== u.uid) e.currentTarget.style.background = "transparent"; }}
                        onClick={() => { setGrantUserId(u.uid); setUserSearch(u.name ?? u.email ?? ""); }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: "#5C6B57", color: "var(--adm-text)" }}>
                          {(u.name ?? "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs truncate" style={{ color: "var(--adm-text)" }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: "var(--adm-text-3)" }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "var(--adm-text-2)" }}>Program</label>
                <select
                  value={grantProgram}
                  onChange={e => { setGrantProgram(e.target.value); setGrantLevel(""); setGrantBatch(""); }}
                  style={inputStyle}
                  className="admin-select"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id} style={{ background: "#1C1B19" }}>
                      {p.title ? `${p.title} (${p.duration}d)` : `${p.duration}-Day Program`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs mb-1.5 block" style={{ color: "var(--adm-text-2)" }}>Start Date (optional)</label>
                <input type="date" value={grantStart} onChange={e => setGrantStart(e.target.value)} style={inputStyle} />
              </div>

              {(() => {
                const prog = programs.find(p => p.id === grantProgram);
                return prog?.levels?.length ? (
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: "var(--adm-text-2)" }}>Level</label>
                    <select value={grantLevel} onChange={e => setGrantLevel(e.target.value)} style={inputStyle} className="admin-select">
                      <option value="" style={{ background: "#1C1B19" }}>Select level…</option>
                      {prog.levels.map(l => <option key={l} value={l} style={{ background: "#1C1B19" }}>{l}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              {(() => {
                const prog = programs.find(p => p.id === grantProgram);
                return prog?.batches?.length ? (
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: "var(--adm-text-2)" }}>Batch</label>
                    <select value={grantBatch} onChange={e => setGrantBatch(e.target.value)} style={inputStyle} className="admin-select">
                      <option value="" style={{ background: "#1C1B19" }}>Select batch…</option>
                      {prog.batches.map(b => <option key={b.name} value={b.name} style={{ background: "#1C1B19" }}>{b.name} · {b.time}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}
            </div>

            <AnimatePresence>
              {grantError && (
                <motion.p className="text-xs flex items-center gap-1.5" style={{ color: "#D47070" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AlertCircle size={12} />{grantError}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleGrant}
              disabled={granting || !grantUserId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all"
              style={{
                background: granting || !grantUserId ? "var(--adm-input)" : "#5C6B57",
                color: granting || !grantUserId ? "rgba(246,244,239,0.28)" : "#F6F4EF",
              }}
              whileHover={!granting && grantUserId ? { background: "#4A5645" } : {}}
              whileTap={!granting && grantUserId ? { scale: 0.97 } : {}}
            >
              {granting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent" style={{ borderColor: "rgba(246,244,239,0.4)" }} />
              ) : (
                <UserPlus size={13} />
              )}
              {granting ? "Granting…" : "Grant Access"}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Enrollments List ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-sm tracking-widest uppercase" style={{ color: "var(--adm-text-2)" }}>
              All Enrollments ({filteredEnrollments.length})
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-3)" }} />
                <input
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search users…"
                  className="pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)", width: "160px" }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="admin-select px-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text-2)" }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={programFilter}
                onChange={e => setProgramFilter(e.target.value)}
                className="admin-select px-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text-2)" }}
              >
                <option value="all">All Programs</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.title ?? `${p.id}d`}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={6} />
          ) : filteredEnrollments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No enrollments found.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--adm-border)" }}>
              <div className="overflow-x-auto admin-scroll">
                <table className="admin-table" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>User</th>
                      <th className="hidden md:table-cell">Program</th>
                      <th className="hidden sm:table-cell">Period</th>
                      <th className="hidden lg:table-cell">Remaining</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.map((e, i) => {
                      const u = userMap.get(e.userId);
                      const isActive = e.status === "active" && e.endDate > new Date().toISOString();
                      return (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        >
                          <td><StatusBadge status={e.status} endDate={e.endDate} /></td>
                          <td>
                            <div>
                              <p className="font-medium" style={{ color: "var(--adm-text)" }}>{u?.name ?? "—"}</p>
                              <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-3)" }}>{u?.email ?? e.userId.slice(0,12)+"…"}</p>
                            </div>
                          </td>
                          <td className="hidden md:table-cell">
                            <div>
                              <span>{e.programId}-Day</span>
                              {e.level && <span style={{ color: "var(--adm-text-2)" }}> · {e.level}</span>}
                              {e.batch && <span style={{ color: "var(--adm-text-2)" }}> · {e.batch}</span>}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell" style={{ color: "var(--adm-text-3)", fontSize: "0.75rem" }}>
                            {new Date(e.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            {" → "}
                            {new Date(e.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </td>
                          <td className="hidden lg:table-cell">
                            {isActive && e.remainingDays !== undefined ? (
                              <span className="text-xs" style={{ color: e.remainingDays < 7 ? "#D47070" : "#8FA888" }}>
                                {e.remainingDays}d left
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            {isActive && (
                              <div className="flex items-center gap-1.5">
                                {extendId === e.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      value={extendDate}
                                      onChange={ev => setExtendDate(ev.target.value)}
                                      className="text-xs rounded-lg px-2 py-1"
                                      style={{ background: "var(--adm-border)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--adm-text)", fontSize: "0.75rem" }}
                                    />
                                    <button onClick={handleExtend} disabled={extendBusy} className="px-2 py-1 rounded-lg text-xs" style={{ background: "#5C6B57", color: "var(--adm-text)" }}>
                                      {extendBusy ? "…" : "Save"}
                                    </button>
                                    <button onClick={() => { setExtendId(null); setExtendDate(""); }} className="p-1" style={{ color: "var(--adm-text-2)" }}>
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => { setExtendId(e.id); setExtendDate(e.endDate); }}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all"
                                      style={{ background: "rgba(92,107,87,0.12)", color: "#8FA888", border: "1px solid rgba(92,107,87,0.25)" }}
                                      onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(92,107,87,0.22)")}
                                      onMouseLeave={ev => (ev.currentTarget.style.background = "rgba(92,107,87,0.12)")}
                                    >
                                      <CalendarClock size={10} /> Extend
                                    </button>
                                    <button
                                      onClick={() => handleRevoke(e.id)}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all"
                                      style={{ background: "rgba(192,64,64,0.1)", color: "#D47070", border: "1px solid rgba(192,64,64,0.2)" }}
                                      onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(192,64,64,0.18)")}
                                      onMouseLeave={ev => (ev.currentTarget.style.background = "rgba(192,64,64,0.1)")}
                                    >
                                      <XCircle size={10} /> Revoke
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
