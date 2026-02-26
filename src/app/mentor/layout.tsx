import type { Metadata } from "next";
import { MentorGuard } from "@/components/guards/MentorGuard";

export const metadata: Metadata = {
  title: "Mentor Portal — Atmava",
  description: "Mentor portal for managing students and sessions.",
};

/**
 * Mentor layout — enforces MentorGuard at the segment level.
 * Every page under /mentor is automatically protected.
 * Only users with role === "mentor" or "admin" are allowed through.
 */
export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return <MentorGuard>{children}</MentorGuard>;
}
