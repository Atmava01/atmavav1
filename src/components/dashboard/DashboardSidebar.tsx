"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Video, LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: Home,  label: "Overview",  id: "overview"  },
  { icon: Video, label: "Sessions",  id: "sessions"  },
];

interface Props {
  active: string;
  setActive: (id: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export function DashboardSidebar({ active, setActive, mobileOpen, setMobileOpen }: Props) {
  const { userProfile, signOut } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

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

  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <>
      {/* Backdrop overlay on mobile */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            className="fixed inset-0 z-30"
            style={{ background: "rgba(44,43,41,0.5)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
        style={{ width: "220px", background: "#E8E1D6", borderRight: "1px solid #D4CCBF" }}
        initial={{ x: -220, opacity: 0 }}
        animate={{ x: isMobile ? (mobileOpen ? 0 : -220) : 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid #D4CCBF" }}>
          <div className="min-w-0">
            <Link href="/">
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "#2C2B29", letterSpacing: "0.14em" }}>
                Atmava
              </span>
            </Link>
            {userProfile?.programTitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "#7A7771" }}>{userProfile.programTitle}</p>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg ml-2 flex-shrink-0"
              style={{ color: "#7A7771" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <motion.button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left relative"
                  onClick={() => handleNavClick(item.id)}
                  whileHover={{ background: "rgba(92,107,87,0.08)" }}
                  whileTap={{ scale: 0.97 }}
                  animate={{ background: isActive ? "rgba(92,107,87,0.12)" : "transparent" }}
                  transition={{ duration: 0.15 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: "#5C6B57" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={14} style={{ color: isActive ? "#5C6B57" : "#7A7771", flexShrink: 0 }} />
                  <span className="text-xs md:text-sm" style={{ color: isActive ? "#2C2B29" : "#7A7771", fontWeight: isActive ? 500 : 400 }}>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

          </div>
        </nav>

        {/* User footer */}
        <div className="px-2.5 pb-4" style={{ borderTop: "1px solid #D4CCBF" }}>
          <div className="pt-3 px-2.5">
            <div className="flex items-center gap-2.5 mb-3">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="av" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: "#5C6B57", color: "#F6F4EF" }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: "#2C2B29" }}>{userProfile?.name ?? "Member"}</p>
              </div>
            </div>
            <motion.button
              className="flex items-center gap-2 py-1"
              whileHover={{ opacity: 0.7 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
            >
              <LogOut size={12} style={{ color: "#7A7771" }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: "#7A7771" }}>Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
