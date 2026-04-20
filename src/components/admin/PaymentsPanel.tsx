"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, TrendingUp, ChevronDown, X } from "lucide-react";
import { getPaymentsAdmin, getEnrollmentsAdmin, deactivateEnrollment, getAllUsers, getPrograms } from "@/lib/firestore";
import { SkeletonCard, SkeletonTable } from "@/components/admin/ui/Skeleton";
import { useToast } from "@/components/admin/ui/Toast";
import { TopBar } from "@/components/admin/ui/TopBar";
import type { Payment, Enrollment, UserProfile, Program } from "@/types";

function fmtAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function fmtDateShort(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
  catch { return iso; }
}

const STATUS_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
  paid:    { bg: "rgba(92,107,87,0.16)",   text: "#8FA888", border: "rgba(92,107,87,0.35)",   label: "Paid"    },
  created: { bg: "rgba(212,170,80,0.12)",  text: "#D4B566", border: "rgba(212,170,80,0.3)",   label: "Pending" },
  failed:  { bg: "rgba(192,64,64,0.12)",   text: "#D47070", border: "rgba(192,64,64,0.3)",    label: "Failed"  },
  active:  { bg: "rgba(92,107,87,0.16)",   text: "#8FA888", border: "rgba(92,107,87,0.35)",   label: "Active"  },
  expired: { bg: "var(--adm-input)", text: "rgba(246,244,239,0.35)", border: "var(--adm-input-border)", label: "Expired" },
};

// ── Mini sparkline chart ─────────────────────────────────────────────────────

function Sparkline({ data, color = "#7A8C74" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 120, H = 32, PAD = 2;
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const fillPath = `M ${pts[0]} L ${pts.join(" L ")} L ${PAD + (W - PAD * 2)},${H} L ${PAD},${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <path d={fillPath} fill={`${color}22`} />
      <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Bar chart (monthly) ──────────────────────────────────────────────────────

function MonthlyChart({ payments }: { payments: Payment[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("en-IN", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });

  const data = months.map(m => {
    const total = payments
      .filter(p => p.status === "paid")
      .filter(p => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    return { ...m, amount: total };
  });

  const max = Math.max(...data.map(d => d.amount), 1);
  const currentMonth = now.getMonth();

  return (
    <div className="p-5 rounded-2xl" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs tracking-widest uppercase" style={{ color: "var(--adm-text-3)" }}>Monthly Revenue</p>
          <p className="text-sm mt-0.5" style={{ color: "#8FA888" }}>
            {fmtAmount(data[data.length - 1].amount)} this month
          </p>
        </div>
        <TrendingUp size={16} style={{ color: "rgba(122,140,116,0.5)" }} />
      </div>
      <div className="flex items-end gap-2" style={{ height: "72px" }}>
        {data.map((d, i) => {
          const heightPct = max > 0 ? (d.amount / max) * 100 : 0;
          const isCurrent = d.month === currentMonth;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{ background: "#2C2B29", color: "var(--adm-text)", border: "1px solid var(--adm-elevated)" }}>
                {fmtAmount(d.amount)}
              </div>
              <div className="w-full rounded-t-md transition-all" style={{
                height: `${Math.max(heightPct, 3)}%`,
                background: isCurrent ? "#7A8C74" : "rgba(122,140,116,0.25)",
                minHeight: "3px",
              }} />
              <span className="text-xs" style={{ color: isCurrent ? "#8FA888" : "rgba(246,244,239,0.28)", fontSize: "0.65rem" }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CSV export ───────────────────────────────────────────────────────────────

function exportPaymentsCSV(payments: Payment[], users: UserProfile[]) {
  const userMap = new Map(users.map(u => [u.uid, u]));
  const rows = [
    ["Date", "User", "Email", "Program", "Amount", "Status", "Mode", "Order ID"],
    ...payments.map(p => {
      const u = userMap.get(p.userId);
      return [
        fmtDate(p.createdAt),
        u?.name ?? p.userId,
        u?.email ?? "",
        `${p.programId}-Day`,
        (p.amount / 100).toFixed(2),
        p.status,
        p.mode,
        p.razorpayOrderId,
      ];
    }),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "payments.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Main ─────────────────────────────────────────────────────────────────────

type Tab         = "payments" | "enrollments";
type StatusFilter = "all" | "paid" | "created" | "failed";

export function PaymentsPanel() {
  const [tab, setTab]                   = useState<Tab>("payments");
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [enrollments, setEnrollments]   = useState<Enrollment[]>([]);
  const [users, setUsers]               = useState<UserProfile[]>([]);
  const [programs, setPrograms]         = useState<Program[]>([]);
  const [loading, setLoading]           = useState(true);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [programFilter, setProgramFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([getPaymentsAdmin(), getEnrollmentsAdmin(), getAllUsers(500), getPrograms()])
      .then(([p, e, u, pr]) => { setPayments(p); setEnrollments(e); setUsers(u); setPrograms(pr); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const userMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);

  const paidPayments  = payments.filter(p => p.status === "paid");
  const liveRevenue   = paidPayments.filter(p => p.mode === "live").reduce((s, p) => s + p.amount, 0);
  const testRevenue   = paidPayments.filter(p => p.mode === "test").reduce((s, p) => s + p.amount, 0);
  const totalRevenue  = liveRevenue + testRevenue;
  const activeEnrolls = enrollments.filter(e => e.status === "active" && e.endDate > new Date().toISOString()).length;

  // 7-day daily revenue sparkline
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i);
      const ds = d.toISOString().split("T")[0];
      return paidPayments
        .filter(p => p.createdAt.startsWith(ds))
        .reduce((s, p) => s + p.amount, 0);
    });
  }, [paidPayments]);

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (programFilter !== "all") list = list.filter(p => p.programId === programFilter);
    return list;
  }, [payments, statusFilter, programFilter]);

  const handleDeactivate = async (id: string) => {
    setDeactivating(id);
    try {
      await deactivateEnrollment(id);
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: "expired" } : e));
      toast("Enrollment deactivated");
    } catch { toast("Failed to deactivate", "error"); }
    setDeactivating(null);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "payments",    label: `Payments (${payments.length})` },
    { id: "enrollments", label: `Enrollments (${enrollments.length})` },
  ];

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Payments"
        subtitle="Revenue, transactions & enrollments"
        onOpenPalette={() => {}}
        actions={
          <button
            onClick={() => exportPaymentsCSV(filteredPayments, users)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
            style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-input-border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-input)")}
          >
            <Download size={12} /> Export CSV
          </button>
        }
      />

      <div className="px-6 md:px-10 py-6 space-y-6 max-w-6xl">

        {/* Stats + chart */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Stats */}
            <div className="lg:col-span-3 grid grid-cols-2 gap-4">
              {[
                { label: "Total Revenue",   value: fmtAmount(totalRevenue),  note: "all time",  spark: true    },
                { label: "Live Revenue",    value: fmtAmount(liveRevenue),   note: "production", spark: false   },
                { label: "Test Revenue",    value: fmtAmount(testRevenue),   note: "dev mode",  spark: false   },
                { label: "Active Enrolls",  value: activeEnrolls.toString(), note: "right now", spark: false   },
              ].map(s => (
                <motion.div
                  key={s.label}
                  className="p-5 rounded-2xl flex flex-col justify-between"
                  style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "var(--adm-text-3)" }}>{s.label}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "var(--adm-text)", fontWeight: 300 }}>
                      {s.value}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <p className="text-xs" style={{ color: "var(--adm-text-4)" }}>{s.note}</p>
                    {s.spark && <Sparkline data={dailyData} />}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Monthly chart */}
            <div className="lg:col-span-2">
              <MonthlyChart payments={payments} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--adm-elevated)" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: tab === t.id ? "rgba(122,140,116,0.2)" : "transparent",
                  color:      tab === t.id ? "#8FA888"               : "rgba(246,244,239,0.4)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters (payments only) */}
          {tab === "payments" && !loading && (
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="admin-select px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "rgba(246,244,239,0.6)" }}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="created">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={programFilter}
                onChange={e => setProgramFilter(e.target.value)}
                className="admin-select px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "rgba(246,244,239,0.6)" }}
              >
                <option value="all">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title ?? `${p.id}-Day`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonTable rows={6} />
        ) : (
          <AnimatePresence mode="wait">

            {/* ── Payments ── */}
            {tab === "payments" && (
              <motion.div key="payments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No payments match the current filter.</p>
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
                            <th className="hidden sm:table-cell">Mode</th>
                            <th>Amount</th>
                            <th className="hidden lg:table-cell">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((p, i) => {
                            const sc = STATUS_META[p.status] ?? STATUS_META.created;
                            const u = userMap.get(p.userId);
                            return (
                              <motion.tr
                                key={p.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(i * 0.02, 0.25) }}
                              >
                                <td>
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                    {sc.label}
                                  </span>
                                </td>
                                <td>
                                  <div>
                                    <p style={{ color: "var(--adm-text)" }}>{u?.name ?? "—"}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-3)" }}>{u?.email ?? p.userId.slice(0,14)+"…"}</p>
                                  </div>
                                </td>
                                <td className="hidden md:table-cell">{p.programId}-Day</td>
                                <td className="hidden sm:table-cell">
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.mode === "live" ? "rgba(92,107,87,0.12)" : "rgba(212,170,80,0.1)", color: p.mode === "live" ? "#8FA888" : "#D4B566" }}>
                                    {p.mode}
                                  </span>
                                </td>
                                <td style={{ color: p.status === "paid" ? "#8FA888" : "rgba(246,244,239,0.65)", fontWeight: p.status === "paid" ? 500 : 400 }}>
                                  {fmtAmount(p.amount)}
                                </td>
                                <td className="hidden lg:table-cell" style={{ color: "var(--adm-text-3)" }}>
                                  {fmtDateShort(p.createdAt)}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Enrollments ── */}
            {tab === "enrollments" && (
              <motion.div key="enrollments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {enrollments.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No enrollments yet.</p>
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
                            <th className="hidden lg:table-cell">Batch</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrollments.map((e, i) => {
                            const sc = STATUS_META[e.status] ?? STATUS_META.expired;
                            const u = userMap.get(e.userId);
                            const isActive = e.status === "active" && e.endDate > new Date().toISOString();
                            return (
                              <motion.tr
                                key={e.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(i * 0.02, 0.25) }}
                              >
                                <td>
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                    {isActive ? "Active" : "Expired"}
                                  </span>
                                </td>
                                <td>
                                  <div>
                                    <p style={{ color: "var(--adm-text)" }}>{u?.name ?? "—"}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-3)" }}>{u?.email ?? e.userId.slice(0,14)+"…"}</p>
                                  </div>
                                </td>
                                <td className="hidden md:table-cell">{e.programId}-Day {e.level && `· ${e.level}`}</td>
                                <td className="hidden sm:table-cell" style={{ color: "var(--adm-text-2)", fontSize: "0.75rem" }}>
                                  {fmtDateShort(e.startDate)} → {fmtDateShort(e.endDate)}
                                </td>
                                <td className="hidden lg:table-cell" style={{ color: "var(--adm-text-2)" }}>
                                  {e.batch || "—"}
                                </td>
                                <td>
                                  {isActive && (
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => handleDeactivate(e.id)}
                                        disabled={deactivating === e.id}
                                        className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
                                        style={{ background: "rgba(192,64,64,0.1)", color: "#D47070", border: "1px solid rgba(192,64,64,0.2)" }}
                                        onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(192,64,64,0.18)")}
                                        onMouseLeave={ev => (ev.currentTarget.style.background = "rgba(192,64,64,0.1)")}
                                      >
                                        {deactivating === e.id ? "…" : "Deactivate"}
                                      </button>
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
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
