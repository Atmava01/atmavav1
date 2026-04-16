"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "./DashboardSidebar";

const SECTION_LABELS: Record<string, string> = {
  "/dashboard":                          "Dashboard",
  "/dashboard/journey":                  "My Journey",
  "/dashboard/today":                    "Today's Class",
  "/dashboard/schedule":                 "Schedule",
  "/dashboard/sessions":                 "Session History",
  "/dashboard/progress":                 "Progress",
  "/dashboard/achievements":             "Achievements",
  "/dashboard/journal":                  "Journal",
  "/dashboard/circle":                   "Circle",
  "/dashboard/refer":                    "Refer & Earn",
  "/dashboard/billing":                  "Billing",
  "/dashboard/settings":                 "Settings",
  "/dashboard/settings/change-password": "Change Password",
  "/dashboard/profile":                  "Profile",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAvatar, setShowAvatar]  = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    setShowAvatar(false);
    await signOut();
    router.push("/");
  };

  const sectionLabel = SECTION_LABELS[pathname] ?? "Dashboard";
  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <div className="min-h-screen flex" style={{ background: "#F6F4EF" }}>
      <DashboardSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main content — offset for sidebar on md+ */}
      <div className="flex-1 min-w-0 md:ml-[260px]">

        {/* Top bar */}
        <motion.div
          className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between"
          style={{
            background: "rgba(246,244,239,0.88)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #D4CCBF",
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Left: mobile hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <motion.button
              className="md:hidden p-1.5 rounded-lg"
              style={{ color: "#4A4845" }}
              onClick={() => setMobileOpen(true)}
              whileTap={{ scale: 0.95 }}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </motion.button>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>
              {sectionLabel}
            </p>
          </div>

          {/* Right: avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAvatar(v => !v)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-full"
              style={{ outline: "none" }}
              aria-label="Profile menu"
              aria-expanded={showAvatar}
              aria-haspopup="true"
            >
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  className="w-8 h-8 rounded-full object-cover"
                  alt="avatar"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer select-none"
                  style={{ background: "#5C6B57", color: "#F6F4EF" }}
                >
                  {initials}
                </div>
              )}
            </button>

            <AnimatePresence>
              {showAvatar && (
                <>
                  {/* Click-outside overlay */}
                  <motion.div
                    className="fixed inset-0 z-40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAvatar(false)}
                  />

                  <motion.div
                    className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden w-52"
                    style={{
                      background: "#F6F4EF",
                      border: "1px solid #D4CCBF",
                      boxShadow: "0 12px 32px rgba(44,43,41,0.12)",
                    }}
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #D4CCBF" }}>
                      <p className="text-xs font-medium truncate" style={{ color: "#2C2B29" }}>
                        {userProfile?.name ?? "Member"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#4A4845" }}>
                        {user?.email ?? ""}
                      </p>
                    </div>

                    {/* My Profile */}
                    <Link href="/dashboard/profile" onClick={() => setShowAvatar(false)}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 text-xs cursor-pointer transition-colors"
                        style={{ color: "#2C2B29" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#E8E1D6")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <User size={13} style={{ color: "#5C6B57" }} />
                        My Profile
                      </div>
                    </Link>

                    {/* Settings */}
                    <Link href="/dashboard/settings" onClick={() => setShowAvatar(false)}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 text-xs cursor-pointer transition-colors"
                        style={{ color: "#2C2B29" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#E8E1D6")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <Settings size={13} style={{ color: "#5C6B57" }} />
                        Settings
                      </div>
                    </Link>

                    <div style={{ borderTop: "1px solid #D4CCBF" }} />

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs text-left cursor-pointer transition-colors"
                      style={{ color: "#4A4845" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#E8E1D6")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Page content */}
        <div className={`px-3 md:px-8 py-4 md:py-8 ${
          pathname === "/dashboard/circle" || pathname === "/dashboard/journal"
            ? "max-w-6xl"
            : "max-w-4xl"
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}
