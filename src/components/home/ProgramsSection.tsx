"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getPrograms } from "@/lib/firestore";
import { PaymentModal } from "@/components/PaymentModal";
import type { Program } from "@/types";

// ── Fallback programs (shown while Firestore loads or if it fails) ────────────
const FALLBACK_PROGRAMS: Program[] = [
  {
    id: "30",
    title: "Foundation",
    duration: 30,
    description: "Ground yourself in daily practice. Learn to observe the mind, establish stillness rituals, and build an unshakeable base for growth.",
    price: 999,
    isActive: true,
    isFree: false,
    features: ["Live daily sessions (Mon–Sat)", "Morning & Evening batches", "Daily journaling prompts", "Mentor guidance", "Community access"],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [],
    levels: [],
  },
  {
    id: "60",
    title: "Deepening",
    duration: 60,
    description: "Move beyond the surface. Dissolve conditioning, integrate shadow work, and cultivate a living relationship with awareness.",
    price: 2999,
    isActive: true,
    isFree: false,
    features: ["Live daily sessions (Mon–Sat)", "Morning & Evening batches", "Weekly 1:1 mentor check-in", "Shadow work framework", "Somatic practices"],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [],
    levels: [],
  },
  {
    id: "90",
    title: "Inner Mastery",
    duration: 90,
    description: "The complete Atmava immersion. Three months of structured transformation across all layers.",
    price: 8999,
    isActive: true,
    isFree: false,
    features: ["Live daily sessions (Mon–Sat)", "Morning & Evening batches", "Weekly 1:1 mentor sessions", "Full resource library", "Lifetime community access"],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [],
    levels: [],
  },
];

const SUBTITLES: Record<string, string> = {
  "30": "Begin the return",
  "60": "Go further within",
  "90": "Embody the stillness",
};

// ── Program card ──────────────────────────────────────────────────────────────
interface CardProps {
  prog: Program;
  i: number;
  featured: boolean;
  userProgramId: string | null | undefined;
  isLoggedIn: boolean;
  onBuyClick: (prog: Program) => void;
}

function ProgramCard({ prog, i, featured, userProgramId, isLoggedIn, onBuyClick }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const isEnrolled = isLoggedIn && userProgramId === prog.id;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        border:     featured ? "1px solid rgba(92,107,87,0.4)" : "1px solid #D4CCBF",
        background: featured ? "rgba(92,107,87,0.04)" : "rgba(246,244,239,0.7)",
        backdropFilter: "blur(12px)",
      }}
      whileHover={{
        y: -6,
        boxShadow: featured
          ? "0 20px 48px rgba(92,107,87,0.18)"
          : "0 12px 32px rgba(44,43,41,0.08)",
      }}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: `radial-gradient(circle at 50% 0%, ${
            featured ? "rgba(92,107,87,0.12)" : "rgba(212,204,191,0.3)"
          } 0%, transparent 60%)`,
        }}
      />

      <div className="p-8 relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className="text-xs tracking-[0.22em] uppercase block mb-2" style={{ color: featured ? "#5C6B57" : "#4A4845" }}>
              {prog.duration} Days
            </span>
            <h3 className="text-3xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontWeight: 400 }}>
              {prog.title}
            </h3>
            <p className="text-sm mt-1" style={{ color: "#4A4845", fontStyle: "italic" }}>
              {SUBTITLES[prog.id] ?? ""}
            </p>
          </div>
          {featured && (
            <motion.span
              className="text-xs tracking-widest px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(92,107,87,0.1)", color: "#5C6B57", border: "1px solid rgba(92,107,87,0.2)" }}
              animate={{ boxShadow: ["0 0 0 0 rgba(92,107,87,0.15)", "0 0 12px 4px rgba(92,107,87,0.08)", "0 0 0 0 rgba(92,107,87,0.15)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Popular
            </motion.span>
          )}
        </div>

        {/* Price */}
        <div className="mb-5">
          {prog.isFree ? (
            <span className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#5C6B57", fontWeight: 300 }}>Free</span>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontWeight: 300 }}>
                ₹{prog.price.toLocaleString("en-IN")}
              </span>
              <span className="text-sm" style={{ color: "#4A4845" }}>/ program</span>
            </div>
          )}
        </div>

        <div className="w-full h-px mb-5" style={{ background: featured ? "rgba(92,107,87,0.15)" : "#E8E1D6" }} />

        <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: "#4A4845", fontWeight: 300 }}>
          {prog.description}
        </p>

        {/* Expandable features */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 mb-5 pt-1">
                {prog.features.map((f, fi) => (
                  <motion.div
                    key={fi}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: fi * 0.07 }}
                  >
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#5C6B57" }} />
                    <span className="text-sm" style={{ color: "#4A4845" }}>{f}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(prog.enrolledCount ?? 0) > 0 && (
          <p className="text-xs mb-4" style={{ color: featured ? "rgba(92,107,87,0.7)" : "#4A4845" }}>
            {prog.enrolledCount} people enrolled
          </p>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between mt-auto gap-4">
          <motion.button
            className="text-xs tracking-widest uppercase shrink-0"
            style={{ color: "#4A4845" }}
            onClick={() => setExpanded(!expanded)}
            whileHover={{ color: "#2C2B29" }}
          >
            {expanded ? "Less" : "What's included"}
          </motion.button>

          {isEnrolled ? (
            <Link href="/dashboard">
              <motion.button
                className="px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase shrink-0"
                style={{ background: "#5C6B57", color: "#F6F4EF", border: "1px solid #5C6B57" }}
                whileHover={{ background: "#4A5645" }}
                whileTap={{ scale: 0.97 }}
              >
                Access Program →
              </motion.button>
            </Link>
          ) : prog.isFree ? (
            <Link href={`/auth/signup?program=${prog.id}`}>
              <motion.button
                className="px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase shrink-0"
                style={{ border: `1px solid ${featured ? "#5C6B57" : "#D4CCBF"}`, color: featured ? "#5C6B57" : "#4A4845", background: "transparent" }}
                whileHover={{ background: featured ? "#5C6B57" : "#2C2B29", color: "#F6F4EF" }}
                whileTap={{ scale: 0.97 }}
              >
                Get Started
              </motion.button>
            </Link>
          ) : (
            /* Paid → open PaymentModal (or redirect to signup if not logged in) */
            <motion.button
              onClick={() => onBuyClick(prog)}
              className="px-5 py-2.5 rounded-xl text-xs tracking-widest uppercase shrink-0"
              style={{
                border:     `1px solid ${featured ? "#5C6B57" : "#D4CCBF"}`,
                color:      featured ? "#5C6B57" : "#4A4845",
                background: "transparent",
              }}
              whileHover={{
                background:  featured ? "#5C6B57" : "#2C2B29",
                color:       "#F6F4EF",
                borderColor: featured ? "#5C6B57" : "#2C2B29",
                boxShadow:   "0 4px 16px rgba(92,107,87,0.15)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.25 }}
            >
              Begin {prog.title} →
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Inner section (needs useSearchParams → must be inside Suspense) ───────────
function ProgramsSectionInner() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [programs, setPrograms]     = useState<Program[]>([]);
  const [loading, setLoading]       = useState(true);
  const [buyingProg, setBuyingProg] = useState<Program | null>(null);

  // Load programs from Firestore; fall back to static list on error
  useEffect(() => {
    getPrograms()
      .then(data => {
        const active = data.filter(p => p.isActive).sort((a, b) => Number(a.id) - Number(b.id));
        setPrograms(active.length >= 3 ? active : FALLBACK_PROGRAMS);
      })
      .catch(() => setPrograms(FALLBACK_PROGRAMS))
      .finally(() => setLoading(false));
  }, []);

  // ── Auto-open PaymentModal from ?buy=<programId> ──────────────────────────
  // Flow: user clicks "Begin X →" while logged out → /auth/signup?program=X&action=buy
  //       → signs up / signs in → redirected to /?buy=X → this effect fires
  const buyParam = searchParams.get("buy") ?? "";

  useEffect(() => {
    if (!buyParam)    return;  // no ?buy param
    if (authLoading)  return;  // auth not resolved yet
    if (!user)        return;  // user not signed in (shouldn't reach here)
    if (loading)      return;  // programs not fetched yet
    if (buyingProg)   return;  // modal already open

    const allProgs = programs.length > 0 ? programs : FALLBACK_PROGRAMS;
    const match    = allProgs.find(p => p.id === buyParam);
    if (match) {
      setBuyingProg(match);
      // Remove ?buy from URL so refresh doesn't reopen the modal
      router.replace("/#programs", { scroll: false });
    }
  }, [buyParam, authLoading, user, loading, programs, buyingProg, router]);

  const displayPrograms = programs.length > 0 ? programs : FALLBACK_PROGRAMS;

  const handleBuyClick = (prog: Program) => {
    if (!user) {
      // Not signed in → go to signup with ?program + ?action=buy
      router.push(`/auth/signup?program=${prog.id}&action=buy`);
      return;
    }
    setBuyingProg(prog);
  };

  return (
    <section id="programs" className="py-24 md:py-32 px-6" style={{ background: "#F6F4EF" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16" ref={ref}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
          >
            Programs
          </motion.p>
          <motion.h2
            className="leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 300, color: "#2C2B29" }}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Choose your path
          </motion.h2>
          <motion.p
            className="text-sm mt-4 max-w-sm mx-auto"
            style={{ color: "#4A4845", fontWeight: 300 }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.25 }}
          >
            Three depths of transformation. One destination — yourself.
          </motion.p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-7 h-7 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#5C6B57" }}
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {displayPrograms.map((p, i) => (
              <ProgramCard
                key={p.id}
                prog={p}
                i={i}
                featured={p.id === "60"}
                userProgramId={userProfile?.programId}
                isLoggedIn={!!user}
                onBuyClick={handleBuyClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* PaymentModal — rendered at root level so backdrop covers full page */}
      <AnimatePresence>
        {buyingProg && (
          <PaymentModal
            programId={buyingProg.id}
            programTitle={buyingProg.title}
            durationDays={buyingProg.duration}
            price={buyingProg.price}
            onClose={() => setBuyingProg(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ── Public export — wraps inner in Suspense for useSearchParams ───────────────
export function ProgramsSection() {
  return (
    <Suspense
      fallback={
        <section className="py-32 flex justify-center" style={{ background: "#F6F4EF" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-7 h-7 rounded-full border-2 border-t-transparent"
            style={{ borderColor: "#5C6B57" }}
          />
        </section>
      }
    >
      <ProgramsSectionInner />
    </Suspense>
  );
}
