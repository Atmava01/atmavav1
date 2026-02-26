"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAdminStats } from "@/lib/firestore";

interface Stats {
  totalUsers: number;
  activeEnrollments: number;
  totalPrograms: number;
  upcomingSessions: number;
}

export function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(s => { setStats(s as Stats); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Total Users",         value: stats.totalUsers.toString(),        sub: "registered accounts" },
    { label: "Active Enrollments",  value: stats.activeEnrollments.toString(), sub: "currently enrolled" },
    { label: "Programs",            value: stats.totalPrograms.toString(),      sub: "programs available" },
    { label: "Upcoming Sessions",   value: stats.upcomingSessions.toString(),   sub: "in the next 7 days" },
  ] : [];

  return (
    <div className="space-y-6">
      <motion.h2
        className="text-2xl"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Overview
      </motion.h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#7A8C74" }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ background: "rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "#7A8C74" }}>{card.label}</p>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", color: "#F6F4EF", fontWeight: 300 }}>
                {card.value}
              </span>
              <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.4)" }}>{card.sub}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
