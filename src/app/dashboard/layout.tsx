import type { Metadata } from "next";
import { UserGuard } from "@/components/guards/UserGuard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard — Atmava",
  description: "Your personal practice dashboard.",
};

/**
 * Dashboard layout — enforces auth via UserGuard and wraps every dashboard
 * sub-route (overview, sessions, profile, settings) in the shared shell.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserGuard>
      <DashboardShell>{children}</DashboardShell>
    </UserGuard>
  );
}
