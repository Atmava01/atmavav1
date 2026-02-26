"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { Bell, ArrowRight, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment } from "@/lib/firestore";
import type { Enrollment } from "@/types";

const sections: Record<string, React.ComponentType> = {
  overview:  DashboardOverview,
  sessions:  SessionsPanel,
};

/** Shown when user has not purchased a program yet. */
function NoEnrollmentGate() {
  const router = useRouter();
  return (
    <motion.div
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        className="w-16 h-16 md:w-20 md:h-20 rounded-full mb-6 md:mb-8"
        style={{ background: "radial-gradient(circle, rgba(92,107,87,0.15) 0%, transparent 70%)", border: "1px solid rgba(92,107,87,0.2)" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.6rem, 5vw, 2.2rem)", color: "#2C2B29", fontWeight: 300, marginBottom: "12px" }}>
        Choose Your Path
      </h2>
      <p className="text-xs md:text-sm max-w-xs mb-6 md:mb-8" style={{ color: "#7A7771", lineHeight: 1.7 }}>
        Enroll in a program to access your personalized dashboard, daily practices, and live sessions.
      </p>
      <motion.button
        onClick={() => router.push("/programs")}
        className="flex items-center gap-2 px-6 md:px-7 py-3 md:py-3.5 rounded-xl text-xs md:text-sm tracking-widest uppercase"
        style={{ background: "#5C6B57", color: "#F6F4EF" }}
        whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.2)" }}
        whileTap={{ scale: 0.97 }}
      >
        View Programs
        <ArrowRight size={13} />
      </motion.button>
    </motion.div>
  );
}

/** Shown when the enrollment has expired. */
function ExpiredEnrollmentGate({ enrollment }: { enrollment: Enrollment }) {
  const router = useRouter();
  const endDate = new Date(enrollment.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <motion.div
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-5 md:mb-7" style={{ background: "rgba(212,170,80,0.1)", border: "1px solid rgba(212,170,80,0.25)" }}>
        <span style={{ fontSize: "22px", color: "#d4aa50" }}>⏳</span>
      </div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 4vw, 2rem)", color: "#2C2B29", fontWeight: 300, marginBottom: "10px" }}>
        Enrollment Expired
      </h2>
      <p className="text-xs md:text-sm mb-1" style={{ color: "#7A7771" }}>Your {enrollment.programId}-day program ended on {endDate}.</p>
      <p className="text-xs md:text-sm mb-6 md:mb-8" style={{ color: "#7A7771" }}>Re-enroll to continue your practice.</p>
      <motion.button
        onClick={() => router.push("/programs")}
        className="flex items-center gap-2 px-6 md:px-7 py-3 md:py-3.5 rounded-xl text-xs md:text-sm tracking-widest uppercase"
        style={{ background: "#5C6B57", color: "#F6F4EF" }}
        whileHover={{ background: "#4A5645" }}
        whileTap={{ scale: 0.97 }}
      >
        Renew Enrollment
        <ArrowRight size={13} />
      </motion.button>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [active, setActive]         = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, userProfile }       = useAuth();
  const ActiveSection               = sections[active] || DashboardOverview;

  // Listen for custom navigation events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && sections[detail]) setActive(detail);
    };
    window.addEventListener("dashboard-nav", handler);
    return () => window.removeEventListener("dashboard-nav", handler);
  }, []);

  // ── Enrollment check ──────────────────────────────────────────────────────
  // null  = still loading
  // false = resolved — no active enrollment found
  // Enrollment = resolved — active enrollment found
  const [enrollment, setEnrollment] = useState<Enrollment | null | false>(null);

  useEffect(() => {
    if (!user) return;
    setEnrollment(null); // reset on user change
    getActiveEnrollment(user.uid)
      .then(e => setEnrollment(e ?? false))
      .catch(() => setEnrollment(false));
  }, [user?.uid]);

  // ── Resolve gate state ────────────────────────────────────────────────────
  // Always show spinner until enrollment is definitively resolved (null = loading).
  // This prevents "View Programs" flashing right after a payment redirect.
  const isLoading = enrollment === null;
  const hasAccess = enrollment !== false && enrollment !== null && (enrollment as Enrollment).status === "active";
  const isExpired = enrollment !== false && enrollment !== null && (enrollment as Enrollment).status === "expired";

  return (
    <div className="min-h-screen flex" style={{ background: "#F6F4EF" }}>
        <DashboardSidebar
          active={active}
          setActive={setActive}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main content — responsive left margin */}
        <div className="flex-1 min-w-0 md:ml-[220px]">

          {/* Top bar */}
          <motion.div
            className="sticky top-0 z-30 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between"
            style={{ background: "rgba(246,244,239,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid #D4CCBF" }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <motion.button
                className="md:hidden p-1.5 rounded-lg"
                style={{ color: "#7A7771" }}
                onClick={() => setMobileOpen(true)}
                whileTap={{ scale: 0.95 }}
              >
                <Menu size={18} />
              </motion.button>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>
                {active.charAt(0).toUpperCase() + active.slice(1)}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <motion.button
                className="w-8 h-8 rounded-lg flex items-center justify-center relative"
                style={{ background: "rgba(212,204,191,0.4)", border: "1px solid #D4CCBF" }}
                whileHover={{ borderColor: "#5C6B57" }}
              >
                <Bell size={14} style={{ color: "#7A7771" }} />
                <motion.div
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "#5C6B57" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ background: "#5C6B57", color: "#F6F4EF" }}>
                  {userProfile?.name?.slice(0, 2).toUpperCase() ?? "A"}
                </div>
              )}
            </div>
          </motion.div>

          {/* Main content */}
          <div className="px-3 md:px-8 py-4 md:py-8 max-w-4xl">
            {isLoading ? (
              <div className="flex justify-center py-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-7 h-7 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "#5C6B57" }}
                />
              </div>
            ) : isExpired ? (
              <ExpiredEnrollmentGate enrollment={enrollment as Enrollment} />
            ) : !hasAccess ? (
              <NoEnrollmentGate />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ActiveSection />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
  );
}
