"use client";

// Auth + role protection is handled by src/app/mentor/layout.tsx (MentorGuard).
// This page only renders for verified users with role === "mentor" or "admin".

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MentorSidebar } from "@/components/mentor/MentorSidebar";
import { MentorOverview } from "@/components/mentor/MentorOverview";
import { MentorStudents } from "@/components/mentor/MentorStudents";
import { MentorSessions } from "@/components/mentor/MentorSessions";
import { MentorAttendance } from "@/components/mentor/MentorAttendance";
import { MentorJournals } from "@/components/mentor/MentorJournals";
import { MentorGuideNotes } from "@/components/mentor/MentorGuideNotes";
import { MentorAccount } from "@/components/mentor/MentorAccount";

const PANELS: Record<string, React.ReactNode> = {
  overview:   <MentorOverview />,
  students:   <MentorStudents />,
  sessions:   <MentorSessions />,
  attendance: <MentorAttendance />,
  journals:   <MentorJournals />,
  guidenotes: <MentorGuideNotes />,
  account:    <MentorAccount />,
};

export default function MentorPage() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === "string") {
        setActive(next);
      }
    };

    window.addEventListener("mentor-set-active", handler);
    return () => window.removeEventListener("mentor-set-active", handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#1A1917" }}>
      <MentorSidebar active={active} setActive={setActive} />

      {/* Main content */}
      <main className={`md:ml-[220px] pt-14 md:pt-0 ${
        active === "journals" || active === "attendance"
          ? "h-screen overflow-hidden px-5 py-6 md:px-6 md:py-6"
          : active === "account"
            ? "min-h-screen px-5 py-6 md:px-8 md:py-8"
          : "min-h-screen px-5 py-6 md:px-10 md:py-12"
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className={
              active === "journals" || active === "attendance"
                ? "h-full"
                : active === "account"
                  ? "max-w-5xl"
                  : "max-w-4xl"
            }
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {PANELS[active] ?? <MentorOverview />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
