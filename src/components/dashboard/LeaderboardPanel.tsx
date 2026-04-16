"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export function LeaderboardPanel() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Leaderboard
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>Top practitioners this month</p>
      </div>

      <motion.div
        className="rounded-2xl p-12 flex flex-col items-center text-center"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(92,107,87,0.1)" }}>
          <TrendingUp size={24} style={{ color: "#5C6B57" }} />
        </div>
        <p className="text-base" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Leaderboard coming soon
        </p>
        <p className="text-xs mt-2 max-w-xs" style={{ color: "#4A4845" }}>
          Rankings based on attendance streaks and sessions completed will appear here.
        </p>
      </motion.div>
    </div>
  );
}
