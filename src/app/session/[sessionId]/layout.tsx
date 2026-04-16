import type { Metadata } from "next";
import { SessionGuard } from "@/components/guards/SessionGuard";

export const metadata: Metadata = {
  title: "Session — Ātmava",
  description: "Live session room",
};

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="fixed inset-0 overflow-hidden" style={{ background: "#0A0908" }}>
        {children}
      </div>
    </SessionGuard>
  );
}
