import type { Metadata } from "next";
import { UserGuard } from "@/components/guards/UserGuard";

export const metadata: Metadata = {
  title: "Dashboard — Atmava",
  description: "Your personal practice dashboard.",
};

/**
 * Dashboard layout — enforces UserGuard at the segment level.
 * Every page under /dashboard is automatically protected.
 * Admins and Mentors are redirected to their own areas by UserGuard.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserGuard>{children}</UserGuard>;
}
