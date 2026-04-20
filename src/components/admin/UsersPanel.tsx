"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserCog, ShieldCheck, User, ChevronDown, Users, Filter } from "lucide-react";
import { getAllUsers, setUserRole, getEnrollmentsAdmin, getPaymentsAdmin } from "@/lib/firestore";
import { SkeletonTable } from "@/components/admin/ui/Skeleton";
import { useToast } from "@/components/admin/ui/Toast";
import { TopBar } from "@/components/admin/ui/TopBar";
import type { UserProfile, Enrollment, Payment } from "@/types";

type FilterType = "all" | "enrolled" | "not_enrolled" | "admin" | "mentor";

const ROLE_META = {
  admin:  { label: "Admin",  color: "#D47070", bg: "rgba(192,64,64,0.14)",   icon: ShieldCheck },
  mentor: { label: "Mentor", color: "#8FA888", bg: "rgba(122,140,116,0.14)", icon: UserCog     },
  user:   { label: "User",   color: "var(--adm-text-2)", bg: "var(--adm-input)", icon: User },
};

function Avatar({ name, role }: { name: string; role: string }) {
  const m = ROLE_META[role as keyof typeof ROLE_META] ?? ROLE_META.user;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
      style={{ background: m.bg, color: m.color }}
    >
      {name?.charAt(0)?.toUpperCase() ?? "?"}
    </div>
  );
}

function StatusDot({ enrolled }: { enrolled: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: enrolled ? "#7A8C74" : "rgba(255,255,255,0.2)" }}
      />
      <span className="text-xs" style={{ color: enrolled ? "#8FA888" : "rgba(246,244,239,0.3)" }}>
        {enrolled ? "Enrolled" : "None"}
      </span>
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role as keyof typeof ROLE_META] ?? ROLE_META.user;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full capitalize"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}30` }}
    >
      {m.label}
    </span>
  );
}

// ── User Drawer ──────────────────────────────────────────────────────────────

interface DrawerProps {
  user: UserProfile;
  enrollment: Enrollment | null;
  revenue: number;
  onClose: () => void;
  onRoleChange: (uid: string, role: UserProfile["role"]) => Promise<void>;
}

function UserDrawer({ user, enrollment, revenue, onClose, onRoleChange }: DrawerProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleRole = async (role: UserProfile["role"]) => {
    if (role === user.role) return;
    setSaving(true);
    await onRoleChange(user.uid, role);
    toast(`Role updated to ${role}`);
    setSaving(false);
  };

  const isActive = enrollment?.status === "active" && enrollment.endDate > new Date().toISOString();
  const remaining = enrollment ? Math.max(0, Math.ceil((new Date(enrollment.endDate).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <motion.div
      className="fixed inset-y-0 right-0 z-[100] flex flex-col"
      style={{
        width: "min(420px, 100vw)",
        background: "var(--adm-surface)",
        borderLeft: "1px solid var(--adm-border)",
        boxShadow: "-24px 0 60px rgba(0,0,0,0.3)",
      }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
            style={{ background: ROLE_META[user.role as keyof typeof ROLE_META]?.bg ?? ROLE_META.user.bg, color: ROLE_META[user.role as keyof typeof ROLE_META]?.color ?? ROLE_META.user.color }}
          >
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-3)" }}>{user.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--adm-text-2)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-border)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto admin-scroll px-6 py-5 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Revenue",   value: revenue > 0 ? `₹${(revenue/100).toLocaleString("en-IN")}` : "—" },
            { label: "Program",   value: user.programTitle ? user.programTitle.slice(0, 12) : "None" },
            { label: "Day",       value: user.currentDay ? `Day ${user.currentDay}` : "—" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--adm-text-3)" }}>{s.label}</p>
              <p className="text-sm font-medium" style={{ color: "var(--adm-text)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Enrollment status */}
        {enrollment && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-widest uppercase" style={{ color: "var(--adm-text-3)" }}>Enrollment</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: isActive ? "rgba(92,107,87,0.18)" : "var(--adm-elevated)",
                color: isActive ? "#8FA888" : "rgba(246,244,239,0.35)",
                border: `1px solid ${isActive ? "rgba(92,107,87,0.35)" : "var(--adm-input-border)"}`,
              }}>
                {isActive ? "Active" : "Expired"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs" style={{ color: "var(--adm-text-2)" }}>
              <span>Program: <span style={{ color: "var(--adm-text)" }}>{enrollment.programId}-Day</span></span>
              {enrollment.level && <span>Level: <span style={{ color: "var(--adm-text)" }}>{enrollment.level}</span></span>}
              {enrollment.batch && <span>Batch: <span style={{ color: "var(--adm-text)" }}>{enrollment.batch}</span></span>}
              {isActive && <span>Remaining: <span style={{ color: "#8FA888" }}>{remaining}d</span></span>}
            </div>
            {isActive && (
              <div className="w-full rounded-full overflow-hidden" style={{ background: "var(--adm-border)", height: "3px" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: "#7A8C74",
                    width: `${Math.min(100, ((Number(enrollment.programId) - remaining) / Number(enrollment.programId)) * 100)}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Role */}
        <div>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "var(--adm-text-3)" }}>Role</p>
          <div className="flex gap-2">
            {(["user", "mentor", "admin"] as const).map(r => {
              const m = ROLE_META[r];
              const isSelected = user.role === r;
              return (
                <button
                  key={r}
                  onClick={() => handleRole(r)}
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs capitalize transition-all"
                  style={{
                    background: isSelected ? m.bg : "var(--adm-elevated)",
                    color: isSelected ? m.color : "rgba(246,244,239,0.4)",
                    border: `1px solid ${isSelected ? m.color + "40" : "var(--adm-border)"}`,
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--adm-elevated)" }}>
          {[
            { label: "UID",        value: user.uid },
            { label: "Joined",     value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" },
            { label: "City",       value: user.city ?? "—" },
            { label: "Phone",      value: user.phone ?? "—" },
          ].map(row => (
            <div key={row.label} className="flex items-start justify-between gap-4 py-1.5">
              <span className="text-xs" style={{ color: "var(--adm-text-3)" }}>{row.label}</span>
              <span className="text-xs text-right truncate max-w-[220px]" style={{ color: "rgba(246,244,239,0.65)", fontFamily: row.label === "UID" ? "monospace" : "inherit", fontSize: row.label === "UID" ? "0.7rem" : undefined }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function UsersPanel() {
  const [users, setUsers]             = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments]       = useState<Payment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<FilterType>("all");
  const [drawerUser, setDrawerUser]   = useState<UserProfile | null>(null);
  const [showFilter, setShowFilter]   = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([getAllUsers(500), getEnrollmentsAdmin(500), getPaymentsAdmin()])
      .then(([u, e, p]) => { setUsers(u); setEnrollments(e); setPayments(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const enrollmentMap = useMemo(() => {
    const map = new Map<string, Enrollment>();
    enrollments
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .forEach(e => { if (!map.has(e.userId)) map.set(e.userId, e); });
    return map;
  }, [enrollments]);

  const revenueMap = useMemo(() => {
    const map = new Map<string, number>();
    payments.filter(p => p.status === "paid").forEach(p => {
      map.set(p.userId, (map.get(p.userId) ?? 0) + p.amount);
    });
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      );
    }
    if (filter === "enrolled")     list = list.filter(u => enrollmentMap.has(u.uid));
    if (filter === "not_enrolled") list = list.filter(u => !enrollmentMap.has(u.uid));
    if (filter === "admin")        list = list.filter(u => u.role === "admin");
    if (filter === "mentor")       list = list.filter(u => u.role === "mentor");
    return list;
  }, [users, search, filter, enrollmentMap]);

  const handleRoleChange = async (uid: string, role: UserProfile["role"]) => {
    await setUserRole(uid, role).catch(() => {});
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role } : x));
    if (drawerUser?.uid === uid) setDrawerUser(d => d ? { ...d, role } : d);
  };

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: "all",          label: `All (${users.length})`                },
    { id: "enrolled",     label: "Enrolled"                              },
    { id: "not_enrolled", label: "Not enrolled"                          },
    { id: "mentor",       label: "Mentors"                               },
    { id: "admin",        label: "Admins"                                },
  ];

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Users"
        subtitle={`${users.length} total · ${enrollments.filter(e => e.status === "active").length} enrolled`}
        onOpenPalette={() => {}}
        actions={
          <button
            onClick={() => setShowFilter(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
            style={{
              background: showFilter ? "rgba(122,140,116,0.18)" : "var(--adm-input)",
              color: showFilter ? "#8FA888" : "rgba(246,244,239,0.5)",
              border: "1px solid var(--adm-input-border)",
            }}
          >
            <Filter size={12} /> Filter
            <ChevronDown size={11} style={{ transform: showFilter ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        }
      />

      <div className="flex-1 px-6 md:px-10 py-6 space-y-5 max-w-6xl w-full">

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-3)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--adm-input)",
                border: "1px solid var(--adm-input-border)",
                color: "var(--adm-text)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--adm-text-3)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilter && (
              <motion.div
                className="flex flex-wrap gap-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      background: filter === f.id ? "rgba(122,140,116,0.2)" : "var(--adm-input)",
                      color:      filter === f.id ? "#8FA888"               : "rgba(246,244,239,0.45)",
                      border: `1px solid ${filter === f.id ? "rgba(122,140,116,0.4)" : "var(--adm-border)"}`,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonTable rows={8} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
              <Users size={20} style={{ color: "var(--adm-text-4)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No users found</p>
            {(search || filter !== "all") && (
              <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs" style={{ color: "#7A8C74" }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--adm-border)" }}>
            <div className="overflow-x-auto admin-scroll">
              <table className="admin-table" style={{ background: "rgba(255,255,255,0.02)" }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="hidden md:table-cell">Email</th>
                    <th>Role</th>
                    <th className="hidden sm:table-cell">Program</th>
                    <th className="hidden lg:table-cell">Revenue</th>
                    <th className="hidden lg:table-cell">Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const enrollment = enrollmentMap.get(u.uid) ?? null;
                    const revenue = revenueMap.get(u.uid) ?? 0;
                    const isSelected = drawerUser?.uid === u.uid;
                    return (
                      <motion.tr
                        key={u.uid}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.3) }}
                        style={{ cursor: "pointer", background: isSelected ? "rgba(122,140,116,0.07)" : undefined }}
                        onClick={() => setDrawerUser(isSelected ? null : u)}
                      >
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} role={u.role} />
                            <span className="font-medium" style={{ color: "var(--adm-text)" }}>{u.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ color: "var(--adm-text-2)" }}>{u.email}</td>
                        <td><RoleBadge role={u.role} /></td>
                        <td className="hidden sm:table-cell"><StatusDot enrolled={!!enrollment} /></td>
                        <td className="hidden lg:table-cell" style={{ color: revenue > 0 ? "#8FA888" : "rgba(246,244,239,0.25)" }}>
                          {revenue > 0 ? `₹${(revenue / 100).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="hidden lg:table-cell" style={{ color: "var(--adm-text-3)" }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: isSelected ? "rgba(122,140,116,0.2)" : "var(--adm-input)", color: isSelected ? "#8FA888" : "rgba(246,244,239,0.35)" }}>
                              {isSelected ? "Close" : "View"}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Row count */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs" style={{ color: "var(--adm-text-4)" }}>
            Showing {filtered.length} of {users.length} users
          </p>
        )}
      </div>

      {/* Drawer overlay */}
      <AnimatePresence>
        {drawerUser && (
          <>
            <motion.div
              className="fixed inset-0 z-[99]"
              style={{ background: "rgba(0,0,0,0.3)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerUser(null)}
            />
            <UserDrawer
              user={drawerUser}
              enrollment={enrollmentMap.get(drawerUser.uid) ?? null}
              revenue={revenueMap.get(drawerUser.uid) ?? 0}
              onClose={() => setDrawerUser(null)}
              onRoleChange={handleRoleChange}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
