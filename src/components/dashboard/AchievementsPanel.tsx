"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Wind, Sun, TrendingUp, Flame, Moon, Target,
  Shield, Star, Award, Crown, Lock, GraduationCap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveEnrollment, getAttendanceForUser } from "@/lib/firestore";
import type { Enrollment, Attendance } from "@/types";

// ─── Stats ────────────────────────────────────────────────────────────────────

interface Stats {
  totalAttended: number;
  currentStreak: number;
  personalBest: number;
}

function calcStreak(dates: Set<string>): number {
  let streak = 0;
  const cur = new Date();
  const todayStr = cur.toISOString().split("T")[0];
  for (let i = 0; i < 300; i++) {
    const d = cur.toISOString().split("T")[0];
    if (cur.getDay() === 0) { cur.setDate(cur.getDate() - 1); continue; }
    if (d === todayStr && !dates.has(d)) { cur.setDate(cur.getDate() - 1); continue; }
    if (dates.has(d)) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function calcPersonalBest(dates: Set<string>): number {
  const sorted = Array.from(dates).sort();
  if (!sorted.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const next = new Date(sorted[i] + "T00:00:00");
    const diff = Math.round((next.getTime() - prev.getTime()) / 86400000);
    if (diff === 1 || (diff === 2 && prev.getDay() === 6)) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIERS = {
  starter:  { outer: "#5C6B57", inner: "#1A201A", icon: "#7A9C74", glow: "rgba(92,107,87,0.55)",  label: "#7A9C74",  labelBg: "rgba(92,107,87,0.18)"  },
  bronze:   { outer: "#B87333", inner: "#1E1510", icon: "#D4915A", glow: "rgba(184,115,51,0.55)", label: "#C4834A",  labelBg: "rgba(184,115,51,0.15)" },
  silver:   { outer: "#8FA3B0", inner: "#141A1E", icon: "#B0C8D8", glow: "rgba(143,163,176,0.5)", label: "#9AB4C2",  labelBg: "rgba(143,163,176,0.15)"},
  gold:     { outer: "#D4A847", inner: "#1E1A08", icon: "#F0C84A", glow: "rgba(212,168,71,0.55)", label: "#D4A847",  labelBg: "rgba(212,168,71,0.15)" },
  platinum: { outer: "#C8BFB0", inner: "#1A1918", icon: "#EDE8E0", glow: "rgba(200,191,176,0.5)", label: "#C8BFB0",  labelBg: "rgba(200,191,176,0.12)"},
} as const;

type Tier = keyof typeof TIERS;

// ─── Hexagonal badge SVG ──────────────────────────────────────────────────────

const HEX_OUTER = "36,2 65,19 65,53 36,70 7,53 7,19";
const HEX_INNER = "36,9  59,23 59,49 36,63 13,49 13,23";

const RIVETS = [
  { cx: 36, cy: 2  },
  { cx: 65, cy: 19 },
  { cx: 65, cy: 53 },
  { cx: 36, cy: 70 },
  { cx: 7,  cy: 53 },
  { cx: 7,  cy: 19 },
];

function HexBadge({
  icon: Icon,
  tier,
  earned,
  index,
}: {
  icon: React.ElementType;
  tier: Tier;
  earned: boolean;
  index: number;
}) {
  const t = TIERS[tier];

  if (!earned) {
    return (
      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <polygon points={HEX_OUTER} fill="#2A2826" />
          <polygon points={HEX_INNER} fill="#1A1917" />
          {RIVETS.map((r, i) => (
            <circle key={i} cx={r.cx} cy={r.cy} r="2.5" fill="#2A2826" />
          ))}
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock size={16} style={{ color: "#4A4845" }} strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      style={{ position: "relative", width: 72, height: 72, flexShrink: 0, filter: `drop-shadow(0 0 10px ${t.glow})` }}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.07 + 0.15 }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72">
        <polygon points={HEX_OUTER} fill={t.outer} />
        <polygon points={HEX_INNER} fill={t.inner} />
        <ellipse cx="36" cy="22" rx="12" ry="6" fill="white" fillOpacity="0.06" />
        {RIVETS.map((r, i) => (
          <circle key={i} cx={r.cx} cy={r.cy} r="3" fill={t.outer} stroke={t.inner} strokeWidth="1" />
        ))}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={22} style={{ color: t.icon }} strokeWidth={1.5} />
      </div>
    </motion.div>
  );
}

// ─── Achievement definitions ──────────────────────────────────────────────────
// Ordered HIGHEST → LOWEST (highest at top of DOM, lowest at bottom)

type AchievementDef = {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  howToEarn: string;
  tier: Tier;
  check: (s: Stats, e: Enrollment) => boolean;
};

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "inner-master",
    icon: Crown,
    title: "Inner Master",
    subtitle: "Platinum",
    description: "You completed the full program — a rare and transformative commitment to your inner life. Few make it this far.",
    howToEarn: "Complete your entire program",
    tier: "platinum",
    check: (_s, e) => e.remainingDays <= 0,
  },
  {
    id: "perseverance",
    icon: Award,
    title: "Perseverance",
    subtitle: "Gold III",
    description: "25 consecutive days without breaking. The mind bends to the will of the truly committed.",
    howToEarn: "Achieve a 25-day streak",
    tier: "gold",
    check: (s) => s.personalBest >= 25,
  },
  {
    id: "devoted",
    icon: Star,
    title: "Devoted Soul",
    subtitle: "Gold II",
    description: "60 sessions in. Your practice is no longer something you do — it is something you are.",
    howToEarn: "Attend 60 sessions",
    tier: "gold",
    check: (s) => s.totalAttended >= 60,
  },
  {
    id: "iron-will",
    icon: Shield,
    title: "Iron Will",
    subtitle: "Gold I",
    description: "18 days of unbroken practice. This is the forge where real character is shaped.",
    howToEarn: "Achieve an 18-day streak",
    tier: "gold",
    check: (s) => s.personalBest >= 18,
  },
  {
    id: "consistent",
    icon: Target,
    title: "Consistent",
    subtitle: "Silver III",
    description: "30 sessions attended. Consistency is the only bridge between intention and transformation.",
    howToEarn: "Attend 30 sessions",
    tier: "silver",
    check: (s) => s.totalAttended >= 30,
  },
  {
    id: "half-moon",
    icon: Moon,
    title: "Half Moon",
    subtitle: "Silver II",
    description: "15 sessions in. You have crossed the threshold from beginner to practitioner.",
    howToEarn: "Attend 15 sessions",
    tier: "silver",
    check: (s) => s.totalAttended >= 15,
  },
  {
    id: "flame-keeper",
    icon: Flame,
    title: "Flame Keeper",
    subtitle: "Silver I",
    description: "7 days in a row. The flame of your practice now burns steadier than most dare to kindle.",
    howToEarn: "Achieve a 7-day streak",
    tier: "silver",
    check: (s) => s.personalBest >= 7,
  },
  {
    id: "rising",
    icon: TrendingUp,
    title: "Rising",
    subtitle: "Bronze III",
    description: "A full week of practice completed. You are no longer just beginning — you are building.",
    howToEarn: "Complete your first full week (Mon–Sat)",
    tier: "bronze",
    check: (s) => s.totalAttended >= 6,
  },
  {
    id: "early-bird",
    icon: Sun,
    title: "Early Bird",
    subtitle: "Bronze II",
    description: "Three sessions deep. The habit is beginning to take shape — every sunrise is an invitation.",
    howToEarn: "Attend 3 sessions",
    tier: "bronze",
    check: (s) => s.totalAttended >= 3,
  },
  {
    id: "first-breath",
    icon: Wind,
    title: "First Breath",
    subtitle: "Bronze I",
    description: "Every great journey begins with a single breath. You showed up — and that is everything.",
    howToEarn: "Complete your first session",
    tier: "bronze",
    check: (s) => s.totalAttended >= 1,
  },
  {
    id: "enrolled",
    icon: GraduationCap,
    title: "Enrolled",
    subtitle: "Starter",
    description: "You committed to the path. Enrolling is an act of courage — the decision that changes everything.",
    howToEarn: "Enroll in any program",
    tier: "starter",
    check: () => true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AchievementsPanel() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const e = await getActiveEnrollment(user.uid);
      setEnrollment(e ?? null);
      if (e) {
        const attendance: Attendance[] = await getAttendanceForUser(user.uid, e.programId, 200);
        const presentDates = new Set(attendance.filter(a => a.present).map(a => a.date));
        setStats({
          totalAttended: presentDates.size,
          currentStreak: calcStreak(presentDates),
          personalBest: calcPersonalBest(presentDates),
        });
      } else {
        setStats({ totalAttended: 0, currentStreak: 0, personalBest: 0 });
      }
      setLoading(false);
    })();
  }, [user]);

  // Scroll to bottom on load so the lowest achievement ("Enrolled") is visible first
  useEffect(() => {
    if (!loading && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "instant", block: "end" });
    }
  }, [loading]);

  if (loading || enrollment === undefined) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "#D4CCBF", borderTopColor: "#5C6B57" }} />
      </div>
    );
  }

  const fakeEnrollment = enrollment ?? ({ remainingDays: 999 } as Enrollment);
  const earned = stats ? ACHIEVEMENTS.filter(a => a.check(stats, fakeEnrollment)) : [];
  const earnedIds = new Set(earned.map(a => a.id));
  const earnedCount = earned.length;

  // Index of the highest-tier earned badge (smallest index = closest to top of DOM)
  const firstEarnedIdx = ACHIEVEMENTS.findIndex(a => earnedIds.has(a.id));

  return (
    <div className="max-w-xl pb-8">

      {/* Timeline — highest at top of DOM, lowest (Enrolled) at bottom */}
      <div className="relative mb-8">

        {/* Static spine (full height, muted) */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: 35, width: 2, background: "#E8E1D6", borderRadius: 2 }}
        />

        {/* Earned portion of spine — grows upward from the bottom */}
        {firstEarnedIdx >= 0 && (
          <motion.div
            className="absolute bottom-0"
            style={{
              left: 35,
              width: 2,
              borderRadius: 2,
              background: "linear-gradient(to top, #5C6B57 0%, #7A8C74 100%)",
              transformOrigin: "bottom",
            }}
            initial={{ height: 0 }}
            animate={{
              height: `${((ACHIEVEMENTS.length - firstEarnedIdx - 0.4) / ACHIEVEMENTS.length) * 100}%`,
            }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
          />
        )}

        {/* Achievement rows */}
        <div className="flex flex-col" style={{ gap: 32 }}>
          {ACHIEVEMENTS.map((achievement, index) => {
            const isEarned = earnedIds.has(achievement.id);
            const t = TIERS[achievement.tier];

            return (
              <motion.div
                key={achievement.id}
                className="flex items-start gap-5 relative"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <HexBadge
                  icon={achievement.icon}
                  tier={achievement.tier}
                  earned={isEarned}
                  index={index}
                />

                <div
                  className="flex-1 rounded-2xl p-4 min-w-0 mt-1"
                  style={{
                    background: isEarned ? "#fff" : "rgba(0,0,0,0.025)",
                    border: `1px solid ${isEarned ? "#D4CCBF" : "#ECEAE5"}`,
                    opacity: isEarned ? 1 : 0.55,
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold" style={{ color: isEarned ? "#2C2B29" : "#4A4845" }}>
                      {achievement.title}
                    </p>
                    <span
                      className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: isEarned ? t.labelBg : "rgba(0,0,0,0.05)",
                        color: isEarned ? t.label : "#9A9490",
                      }}
                    >
                      {achievement.subtitle}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: isEarned ? "#4A4845" : "#9A9490" }}>
                    {isEarned ? achievement.description : achievement.howToEarn}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Header + summary — pinned to bottom so user sees this first on page load */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-5">
          <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
            Achievements
          </h1>
          <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
            {earnedCount} of {ACHIEVEMENTS.length} unlocked · scroll up to discover higher achievements
          </p>
        </div>

        {/* Summary bar */}
        <div
          className="rounded-2xl p-4 grid grid-cols-3 gap-0"
          style={{ background: "#1E1D1B" }}
        >
          {[
            { value: stats?.totalAttended ?? 0, label: "Sessions" },
            { value: stats?.currentStreak ?? 0, label: "Streak" },
            { value: earnedCount,               label: "Earned" },
          ].map((s, i) => (
            <div key={s.label} className="text-center" style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <p className="text-2xl font-light" style={{ color: "#F6F4EF" }}>{s.value}</p>
              <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: "rgba(246,244,239,0.38)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scroll anchor — page loads scrolled to this point */}
      <div ref={bottomRef} />
    </div>
  );
}
