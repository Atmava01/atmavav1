"use client";

/**
 * AdminGuard — protects /admin routes.
 *
 * Allowed: role === "admin".
 * Redirects:
 *   • Not logged in              → /auth/login
 *   • Email unverified           → /auth/verify-email
 *   • role !== "admin" or null   → /dashboard
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth/login"); return; }

    const isEmailProvider = user.providerData.some(p => p.providerId === "password");
    if (isEmailProvider && !user.emailVerified) {
      router.replace("/auth/verify-email");
      return;
    }

    // If profile is resolved but role is not admin, go to user dashboard
    if (userProfile !== undefined) {
      if (!userProfile || userProfile.role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, userProfile, loading, router]);

  // ── Render guard ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1A1917" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#7A8C74" }}
        />
      </div>
    );
  }

  if (!user) return null;

  const isEmailProvider = user.providerData.some(p => p.providerId === "password");
  if (isEmailProvider && !user.emailVerified) return null;

  // Only render admin content when role is confirmed
  if (!userProfile || userProfile.role !== "admin") return null;

  return <>{children}</>;
}
