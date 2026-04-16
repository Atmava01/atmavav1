"use client";

/**
 * SessionGuard — protects /session routes.
 *
 * Allowed: any authenticated, email-verified user (role: user, mentor, admin).
 * Redirects:
 *   • Not logged in        → /auth/login
 *   • Email unverified     → /auth/verify-email
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth/login"); return; }

    const isEmailProvider = user.providerData.some(p => p.providerId === "password");
    if (isEmailProvider && !user.emailVerified) {
      router.replace("/auth/verify-email");
    }
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#0A0908" }}>
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(122,140,116,0.3)", borderTopColor: "#7A8C74" }} />
    </div>
  );

  return <>{children}</>;
}
