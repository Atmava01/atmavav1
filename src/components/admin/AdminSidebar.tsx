"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, Users, BookOpen, CreditCard, ClipboardList,
  Video, UserCheck, Layout, LogOut, LayoutDashboard, Menu, X, Command,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { icon: BarChart2,    label: "Overview",    id: "overview"    },
  { icon: Users,        label: "Users",       id: "users"       },
  { icon: BookOpen,     label: "Programs",    id: "programs"    },
  { icon: CreditCard,   label: "Payments",    id: "payments"    },
  { icon: ClipboardList,label: "Enrollments", id: "enrollments" },
  { icon: Video,        label: "Sessions",    id: "sessions"    },
  { icon: UserCheck,    label: "Mentors",     id: "mentors"     },
  { icon: Layout,       label: "Landing Page",id: "landing"     },
];

interface Props {
  active: string;
  setActive: (id: string) => void;
  onOpenPalette: () => void;
}

export function AdminSidebar({ active, setActive, onOpenPalette }: Props) {
  const { signOut } = useAuth();
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
  const handleNav = (id: string) => { setActive(id); if (isMobile) setMobileOpen(false); };
  const currentLabel = NAV.find(n => n.id === active)?.label ?? "Admin";

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ height: "52px", background: "#161614", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", color: "#F6F4EF", letterSpacing: "0.12em" }}>
            Atmava
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.3)" }}>
              {currentLabel}
            </span>
            <button onClick={() => setMobileOpen(true)} className="p-1.5" style={{ color: "rgba(246,244,239,0.6)" }}>
              <Menu size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "220px",
          background: "#161614",
          borderRight: "1px solid rgba(255,255,255,0.065)",
        }}
        initial={{ x: -220 }}
        animate={{ x: isMobile ? (mobileOpen ? 0 : -220) : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.065)" }}>
          <div className="flex items-center justify-between">
            <div>
              <Link href="/?preview=1">
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", color: "#F6F4EF", letterSpacing: "0.12em" }}>
                  Atmava
                </span>
              </Link>
              <p className="text-xs mt-0.5 tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.28)" }}>
                Admin
              </p>
            </div>
            {isMobile && (
              <button onClick={() => setMobileOpen(false)} style={{ color: "rgba(246,244,239,0.45)" }}>
                <X size={15} />
              </button>
            )}
          </div>

          {/* CMD+K button */}
          <button
            onClick={onOpenPalette}
            className="mt-3 w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            <Command size={11} style={{ color: "rgba(246,244,239,0.35)" }} />
            <span className="text-xs flex-1 text-left" style={{ color: "rgba(246,244,239,0.35)" }}>Quick navigate</span>
            <kbd className="text-xs" style={{ color: "rgba(246,244,239,0.25)", fontFamily: "monospace" }}>⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto admin-scroll">
          <div className="space-y-0.5">
            {NAV.map(item => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <motion.button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left relative"
                  onClick={() => handleNav(item.id)}
                  animate={{ background: isActive ? "rgba(122,140,116,0.14)" : "transparent" }}
                  whileHover={{ background: isActive ? "rgba(122,140,116,0.18)" : "rgba(255,255,255,0.055)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                      style={{ background: "#7A8C74" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    size={14}
                    style={{ color: isActive ? "#8FA888" : "rgba(246,244,239,0.38)", flexShrink: 0 }}
                  />
                  <span
                    className="text-sm"
                    style={{
                      color: isActive ? "#F6F4EF" : "rgba(246,244,239,0.48)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-2.5 pb-4 pt-3 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.065)" }}>
          <Link href="/dashboard">
            <motion.div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              whileHover={{ background: "rgba(255,255,255,0.055)" }}
            >
              <LayoutDashboard size={13} style={{ color: "rgba(246,244,239,0.35)" }} />
              <span className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>Dashboard</span>
            </motion.div>
          </Link>
          <motion.button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
            whileHover={{ background: "rgba(192,64,64,0.08)" }}
            onClick={handleSignOut}
          >
            <LogOut size={13} style={{ color: "rgba(246,244,239,0.35)" }} />
            <span className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
