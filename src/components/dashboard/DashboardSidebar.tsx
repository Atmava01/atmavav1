"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Layers,
  PlayCircle,
  FileText,
  BarChart2,
  Trophy,
  BookOpen,
  Users2,
  Share2,
  CreditCard,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, getTodaySessionsForProgram } from "@/lib/firestore";

type Badge = { type: "live" } | { type: "awaiting" } | { type: "count"; value: number };

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: Badge;
}

interface Section {
  label: string;
  items: NavItem[];
}

const SECTIONS: Section[] = [
  {
    label: "HOME",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",    href: "/dashboard" },
      { icon: Layers,          label: "My Journey",   href: "/dashboard/journey" },
    ],
  },
  {
    label: "PRACTICE",
    items: [
      { icon: PlayCircle,  label: "Today's Class",   href: "/dashboard/today" },
      { icon: FileText,    label: "Session History", href: "/dashboard/sessions" },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { icon: BarChart2, label: "Progress",     href: "/dashboard/progress" },
      { icon: Trophy,    label: "Achievements", href: "/dashboard/achievements" },
      { icon: BookOpen,  label: "Journal",      href: "/dashboard/journal" },
    ],
  },
  {
    label: "COMMUNITY",
    items: [
      { icon: Users2, label: "Circle",       href: "/dashboard/circle" },
      { icon: Share2, label: "Refer & Earn", href: "/dashboard/refer" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { icon: CreditCard, label: "Billing",  href: "/dashboard/billing" },
      { icon: Settings,   label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

interface Props {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

function checkLive(sessions: import("@/types").Session[]): boolean {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return sessions.some(s => {
    if (s.date !== today) return false;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
  });
}

export function DashboardSidebar({ mobileOpen, setMobileOpen }: Props) {
  const { user, userProfile, signOut } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"live" | "awaiting" | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchAndCheck() {
      const enrollment = await getActiveEnrollment(user!.uid);
      if (!enrollment || cancelled) return;
      const sessions = await getTodaySessionsForProgram(enrollment.programId);
      if (cancelled) return;
      setLiveStatus(checkLive(sessions) ? "live" : "awaiting");
    }

    fetchAndCheck();
    const interval = setInterval(fetchAndCheck, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  const sidebar = (
    <motion.aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{ width: "260px", background: "#1E1D1B", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: isMobile ? (mobileOpen ? 0 : -260) : 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div
        className="px-5 py-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/?preview=1" onClick={() => isMobile && setMobileOpen(false)}>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.35rem",
              color: "#F6F4EF",
              letterSpacing: "0.14em",
            }}
          >
            Atmava
          </span>
        </Link>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg ml-2 flex-shrink-0"
            style={{ color: "rgba(246,244,239,0.4)" }}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? "mt-5" : ""}>
            {/* Section label */}
            <p
              className="px-3 mb-1.5"
              style={{
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(246,244,239,0.3)",
                fontWeight: 500,
              }}
            >
              {section.label}
            </p>

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setMobileOpen(false)}
                  >
                    <motion.div
                      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      animate={{
                        background: active
                          ? "rgba(92,107,87,0.18)"
                          : "transparent",
                      }}
                      whileHover={{ background: active ? "rgba(92,107,87,0.22)" : "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Active indicator */}
                      {active && (
                        <motion.div
                          layoutId="user-sidebar-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: "3px", height: "18px", background: "#7A8C74" }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}

                      <Icon
                        size={15}
                        style={{
                          color: active ? "#7A8C74" : "rgba(246,244,239,0.45)",
                          flexShrink: 0,
                        }}
                      />

                      <span
                        className="flex-1 text-sm"
                        style={{
                          color: active ? "#F6F4EF" : "rgba(246,244,239,0.6)",
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        {item.label}
                      </span>

                      {/* Dynamic live/awaiting badge for Today's Class */}
                      {item.href === "/dashboard/today" && liveStatus === "live" && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
                          style={{ background: "#dc2626", color: "#fff" }}
                        >
                          LIVE
                        </span>
                      )}
                      {item.href === "/dashboard/today" && liveStatus === "awaiting" && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide"
                          style={{ background: "rgba(246,244,239,0.08)", color: "rgba(246,244,239,0.35)" }}
                        >
                          AWAITING
                        </span>
                      )}
                      {/* Static count badge */}
                      {item.badge?.type === "count" && (
                        <span
                          className="text-[11px] font-medium min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5"
                          style={{ background: "rgba(92,107,87,0.4)", color: "#F6F4EF" }}
                        >
                          {item.badge.value}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Sign Out — still in ACCOUNT section visually */}
        <div className="mt-0.5">
          <motion.button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ color: "rgba(246,244,239,0.6)" }}
            whileHover={{ background: "rgba(255,255,255,0.05)", color: "rgba(246,244,239,0.85)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <LogOut size={15} style={{ color: "rgba(246,244,239,0.45)", flexShrink: 0 }} />
            <span className="text-sm">Sign Out</span>
          </motion.button>
        </div>
      </nav>

      {/* User footer */}
      <div
        className="px-3 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5 px-2">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              alt="avatar"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 select-none"
              style={{ background: "#5C6B57", color: "#F6F4EF" }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "#F6F4EF" }}>
              {userProfile?.name ?? "Member"}
            </p>
            <p className="text-xs truncate" style={{ color: "rgba(246,244,239,0.4)" }}>
              {userProfile?.email ?? ""}
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            className="fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {sidebar}
    </>
  );
}
