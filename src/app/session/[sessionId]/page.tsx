"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSessionById } from "@/lib/firestore";
import type { Session } from "@/types";
import { SessionRoom } from "@/components/session/SessionRoom";

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) return;
    getSessionById(sessionId).then(setSession);
  }, [sessionId]);

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0D0C0A" }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(122,140,116,0.3)", borderTopColor: "#7A8C74" }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3" style={{ background: "#0D0C0A" }}>
        <p className="text-sm" style={{ color: "rgba(246,244,239,0.5)" }}>Session not found.</p>
        <a href="/dashboard/today" className="text-xs underline" style={{ color: "#7A8C74" }}>
          Back to Today&apos;s Class
        </a>
      </div>
    );
  }

  return <SessionRoom session={session} />;
}
