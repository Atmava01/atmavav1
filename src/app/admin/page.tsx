"use client";

// Auth + role protection is handled by src/app/admin/layout.tsx (AdminGuard).
// This page only renders for verified users with role === "admin".

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { OverviewPanel }    from "@/components/admin/OverviewPanel";
import { UsersPanel }       from "@/components/admin/UsersPanel";
import { ProgramsPanel }    from "@/components/admin/ProgramsPanel";
import { PaymentsPanel }    from "@/components/admin/PaymentsPanel";
import { SessionsPanel }    from "@/components/admin/SessionsPanel";
import { MentorsPanel }     from "@/components/admin/MentorsPanel";
import { EnrollmentsPanel } from "@/components/admin/EnrollmentsPanel";

type Panel = "overview" | "users" | "payments" | "programs" | "enrollments" | "sessions" | "mentors";

function renderPanel(active: Panel) {
  switch (active) {
    case "overview":    return <OverviewPanel />;
    case "users":       return <UsersPanel />;
    case "payments":    return <PaymentsPanel />;
    case "programs":    return <ProgramsPanel />;
    case "enrollments": return <EnrollmentsPanel />;
    case "sessions":    return <SessionsPanel />;
    case "mentors":     return <MentorsPanel />;
    default:            return <OverviewPanel />;
  }
}

export default function AdminPage() {
  const [active, setActive] = useState<Panel>("overview");

  return (
    <div className="min-h-screen" style={{ background: "#1A1917" }}>
      <AdminSidebar active={active} setActive={setActive as (v: string) => void} />

      <main className="min-h-screen md:ml-[220px] pt-14 md:pt-0 px-4 py-5 md:px-10 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-4xl"
          >
            {renderPanel(active)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
