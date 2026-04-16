"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Users, Calendar, ClipboardList, BookOpen, LogOut, Menu, X, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navGroups = [
  {
    title: "Guide",
    items: [
      { icon: MessageSquare, label: "Guide Notes", id: "guidenotes" },
    ],
  },
  {
    title: "Main",
    items: [
      { icon: BarChart2, label: "Overview", id: "overview" },
      { icon: Calendar, label: "Sessions", id: "sessions" },
      { icon: ClipboardList, label: "Attendance", id: "attendance" },
    ],
  },
  {
    title: "People",
    items: [
      { icon: Users, label: "My Students", id: "students" },
    ],
  },
  {
    title: "Studio",
    items: [
      { icon: BookOpen, label: "Journals", id: "journals" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: User, label: "Account", id: "account" },
    ],
  },
];

interface Props { active: string; setActive: (id: string) => void; }

export function MentorSidebar({ active, setActive }: Props) {
  const { userProfile, signOut } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleSignOut = async () => { await signOut(); router.push("/"); };

  const handleNavClick = (id: string) => {
    setActive(id);
    if (isMobile) setMobileOpen(false);
  };

  const currentLabel = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.id === active)?.label ?? "Mentor";

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────────────────── */}
      {isMobile && (
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5"
          style={{ height: "56px", background: "#2C2B29", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Link href="/?preview=1">
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", color: "#F6F4EF", letterSpacing: "0.14em" }}>
              Atmava
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.35)" }}>
              {currentLabel}
            </p>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg"
              style={{ color: "rgba(246,244,239,0.7)" }}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <motion.aside
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: "220px", background: "#2C2B29", borderRight: "1px solid rgba(255,255,255,0.06)" }}
        initial={{ x: -220, opacity: 0 }}
        animate={{ x: isMobile ? (mobileOpen ? 0 : -220) : 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Brand */}
        <div className="px-6 py-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <Link href="/?preview=1">
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "#F6F4EF", letterSpacing: "0.14em" }}>
                Atmava
              </span>
            </Link>
            <p className="text-xs mt-1 tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.35)" }}>
              Mentor Portal
            </p>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg ml-2 flex-shrink-0"
              style={{ color: "rgba(246,244,239,0.5)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Mentor profile */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} className="w-8 h-8 rounded-full object-cover" alt="mentor" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                style={{ background: "#7A8C74", color: "#F6F4EF" }}
              >
                {userProfile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "M"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs truncate" style={{ color: "#F6F4EF" }}>{userProfile?.name ?? "Mentor"}</p>
              <p className="text-xs" style={{ color: "rgba(246,244,239,0.35)" }}>{userProfile?.specialization ?? "Mentor"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 overflow-y-auto">
          <div className="space-y-5">
            <div className="px-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[10px] tracking-[0.18em] uppercase"
                style={{ background: "rgba(122,140,116,0.16)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.2)" }}
              >
                Mentor
              </span>
            </div>

            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p
                  className="px-3 text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "rgba(246,244,239,0.28)" }}
                >
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left relative"
                        onClick={() => handleNavClick(item.id)}
                        whileHover={{ background: "rgba(246,244,239,0.06)" }}
                        animate={{ background: isActive ? "rgba(122,140,116,0.14)" : "transparent" }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mentor-indicator"
                            className="absolute inset-y-1 left-0 w-0.5 rounded-full"
                            style={{ background: "#7A8C74" }}
                          />
                        )}
                        <Icon size={15} style={{ color: isActive ? "#7A8C74" : "rgba(246,244,239,0.5)", flexShrink: 0 }} />
                        <span
                          className="text-sm"
                          style={{ color: isActive ? "#F6F4EF" : "rgba(246,244,239,0.5)", fontWeight: isActive ? 500 : 400 }}
                        >
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="pt-4 px-3">
            <motion.button className="flex items-center gap-2" whileHover={{ opacity: 0.7 }} onClick={handleSignOut}>
              <LogOut size={13} style={{ color: "rgba(246,244,239,0.5)" }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.5)" }}>Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
