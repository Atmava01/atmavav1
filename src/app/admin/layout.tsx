import type { Metadata } from "next";
import { AdminGuard } from "@/components/guards/AdminGuard";

export const metadata: Metadata = {
  title: "Admin — Atmava",
  description: "Atmava admin panel.",
};

/**
 * Admin layout — enforces AdminGuard at the segment level.
 * Every page under /admin is automatically protected.
 * Only users with role === "admin" are allowed through.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
