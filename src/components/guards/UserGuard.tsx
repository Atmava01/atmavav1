"use client";

/**
 * UserGuard — protects /dashboard routes.
 *
 * Allowed: role === "user" (or no profile yet — shows limited view).
 * Redirects:
 *   • Not logged in              → /auth/login
 *   • Email unverified           → /auth/verify-email
 *   • role === "admin"           → /admin
 *   • role === "mentor"          → /mentor
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export function UserGuard({ children }: { children: React.ReactNode }) {
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

    // Redirect privileged roles to their own areas
    if (userProfile?.role === "admin")  { router.replace("/admin");  return; }
    if (userProfile?.role === "mentor") { router.replace("/mentor"); return; }
  }, [user, userProfile, loading, router]);

  // ── Render guard ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F4EF" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5C6B57" }}
        />
      </div>
    );
  }

  if (!user) return null;

  const isEmailProvider = user.providerData.some(p => p.providerId === "password");
  if (isEmailProvider && !user.emailVerified) return null;

  // Prevent flash of dashboard content for admin/mentor while redirect fires
  if (userProfile?.role === "admin" || userProfile?.role === "mentor") return null;

  return <>{children}</>;
}
