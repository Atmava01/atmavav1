"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar }    from "@/components/admin/AdminSidebar";
import { OverviewPanel }   from "@/components/admin/OverviewPanel";
import { UsersPanel }      from "@/components/admin/UsersPanel";
import { ProgramsPanel }   from "@/components/admin/ProgramsPanel";
import { PaymentsPanel }   from "@/components/admin/PaymentsPanel";
import { SessionsPanel }   from "@/components/admin/SessionsPanel";
import { MentorsPanel }    from "@/components/admin/MentorsPanel";
import { EnrollmentsPanel }from "@/components/admin/EnrollmentsPanel";
import { LandingPagePanel }from "@/components/admin/LandingPagePanel";
import { ToastProvider }      from "@/components/admin/ui/Toast";
import { CommandPalette }     from "@/components/admin/ui/CommandPalette";
import { AdminThemeProvider } from "@/components/admin/ui/ThemeContext";

type Panel = "overview" | "users" | "payments" | "programs" | "enrollments" | "sessions" | "mentors" | "landing";

function renderPanel(active: Panel) {
  switch (active) {
    case "overview":    return <OverviewPanel />;
    case "users":       return <UsersPanel />;
    case "payments":    return <PaymentsPanel />;
    case "programs":    return <ProgramsPanel />;
    case "enrollments": return <EnrollmentsPanel />;
    case "sessions":    return <SessionsPanel />;
    case "mentors":     return <MentorsPanel />;
    case "landing":     return <LandingPagePanel />;
    default:            return <OverviewPanel />;
  }
}

export default function AdminPage() {
  const [active, setActive]           = useState<Panel>("overview");
  const [paletteOpen, setPaletteOpen] = useState(false);

  // CMD+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = (id: string) => setActive(id as Panel);

  return (
    <AdminThemeProvider>
    <ToastProvider>
      <div className="min-h-screen adm-bg">
        <AdminSidebar
          active={active}
          setActive={setActive as (v: string) => void}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="min-h-screen md:ml-[220px] pt-14 md:pt-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full"
            >
              {renderPanel(active)}
            </motion.div>
          </AnimatePresence>
        </main>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={handleNavigate}
        />
      </div>
    </ToastProvider>
    </AdminThemeProvider>
  );
}
