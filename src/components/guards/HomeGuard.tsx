"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function HomeGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";

  useEffect(() => {
    if (loading || preview) return;
    if (!user) return;

    if (userProfile?.role === "admin")  { router.replace("/admin");   return; }
    if (userProfile?.role === "mentor") { router.replace("/mentor");  return; }
    router.replace("/dashboard");
  }, [user, userProfile, loading, preview, router]);

  // Always render children immediately — redirect fires in the background via useEffect.
  // This prevents the blank screen while auth resolves.
  return <>{children}</>;
}
