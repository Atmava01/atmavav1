"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PaymentModal } from "@/components/PaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Check } from "lucide-react";

const programs = [
  {
    days: "30",
    title: "Foundation",
    tagline: "Begin the return to yourself",
    price: "$149",
    priceNum: 149,
    color: "#7A8C74",
    desc: "The Foundation program is your entry point into conscious living. Over 30 days, you'll establish the core practices of stillness, breath, and self-observation — building a platform for lasting transformation.",
    milestones: [
      { day: "Day 1–7", title: "Arrival", desc: "Ground your intention. Learn to observe without reacting." },
      { day: "Day 8–14", title: "Breath", desc: "Pranayama fundamentals. The breath as gateway to presence." },
      { day: "Day 15–21", title: "Stillness", desc: "Formal sitting practice. Meeting the mind as it is." },
      { day: "Day 22–30", title: "Integration", desc: "Bring awareness into daily life. Review and anchor." },
    ],
    includes: [
      "Live daily sessions (Mon–Sat)",
      "Morning & Evening batches",
      "Daily journaling prompts",
      "Mentor guidance",
      "Community access",
    ],
  },
  {
    days: "60",
    title: "Deepening",
    tagline: "Move beyond the surface",
    price: "$279",
    priceNum: 279,
    color: "#5C6B57",
    featured: true,
    desc: "For those who have tasted stillness and are ready to go deeper. The Deepening program works with conditioning, energy, and the subtle layers of consciousness — dissolving what obscures your natural clarity.",
    milestones: [
      { day: "Week 1–2", title: "Foundation Review", desc: "Reinforce core practices. Set intentions for deepening." },
      { day: "Week 3–4", title: "Shadow Work", desc: "Gentle inquiry into unconscious patterns and beliefs." },
      { day: "Week 5–6", title: "Energy Body", desc: "Somatic awareness. Sensing the subtle body in practice." },
      { day: "Week 7–8", title: "Non-Dual Inquiry", desc: "Who is aware? Self-inquiry and open presence." },
    ],
    includes: [
      "Live daily sessions (Mon–Sat)",
      "Morning & Evening batches",
      "Weekly 1:1 mentor check-in",
      "Shadow work framework",
      "Somatic practices",
    ],
  },
  {
    days: "90",
    title: "Inner Mastery",
    tagline: "Embody what you truly are",
    price: "$449",
    priceNum: 449,
    color: "#2C2B29",
    desc: "The complete Atmava immersion. Three months of structured transformation across all layers — mind, body, energy, and spirit. By the end, stillness is not something you find in meditation. It's who you are.",
    milestones: [
      { day: "Month 1", title: "Foundation & Deepening", desc: "Full first two programs, accelerated and integrated." },
      { day: "Month 2", title: "Mastery Practices", desc: "Advanced meditation, energy work, and presence training." },
      { day: "Month 3", title: "Embodiment", desc: "Living the practice. Teaching others. Being the stillness." },
    ],
    includes: [
      "Live daily sessions (Mon–Sat)",
      "Morning & Evening batches",
      "Weekly 1:1 mentor sessions",
      "Full resource library",
      "Lifetime community access",
    ],
  },
];

type Program = typeof programs[0];

function MilestoneMarker({ milestone, i }: { milestone: Program["milestones"][0]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      className="flex gap-5 items-start"
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: i * 0.1 }}
    >
      <div className="flex flex-col items-center" style={{ minWidth: "12px" }}>
        <motion.div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: "#5C6B57", marginTop: "4px" }}
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        />
        {i < 3 && <div className="w-px mt-1.5" style={{ background: "#D4CCBF", height: "48px" }} />}
      </div>
      <div className="pb-6">
        <span className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>{milestone.day}</span>
        <p className="text-sm font-medium mt-0.5 mb-1" style={{ color: "#2C2B29" }}>{milestone.title}</p>
        <p className="text-sm" style={{ color: "#7A7771", fontWeight: 300 }}>{milestone.desc}</p>
      </div>
    </motion.div>
  );
}

function ProgramCard({ prog, i, onEnroll, enrolled }: { prog: Program; i: number; onEnroll: (prog: Program) => void; enrolled: boolean }) {
  const [open, setOpen] = useState(i === 1);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        border: prog.featured ? "1px solid rgba(92,107,87,0.4)" : "1px solid #D4CCBF",
        background: prog.featured ? "rgba(92,107,87,0.03)" : "#F6F4EF",
      }}
    >
      {/* Header */}
      <button
        className="w-full p-8 text-left flex items-start justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <div>
          <span className="text-xs tracking-[0.22em] uppercase block mb-2" style={{ color: "#5C6B57" }}>
            {prog.days} Days
          </span>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem",
              fontWeight: 400,
              color: "#2C2B29",
            }}
          >
            {prog.title}
          </h2>
          <p className="text-sm mt-1" style={{ color: "#7A7771", fontStyle: "italic" }}>{prog.tagline}</p>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#2C2B29", fontWeight: 300 }}
          >
            {prog.price}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown size={18} style={{ color: "#7A7771" }} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 border-t" style={{ borderColor: "#D4CCBF" }}>
              <p className="text-sm leading-relaxed pt-6 mb-10" style={{ color: "#7A7771", fontWeight: 300 }}>
                {prog.desc}
              </p>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Milestones */}
                <div>
                  <p className="text-xs tracking-widest uppercase mb-6" style={{ color: "#5C6B57" }}>Journey Map</p>
                  {prog.milestones.map((m, mi) => (
                    <MilestoneMarker key={m.day} milestone={m} i={mi} />
                  ))}
                </div>

                {/* Includes + CTA */}
                <div>
                  <p className="text-xs tracking-widest uppercase mb-6" style={{ color: "#5C6B57" }}>What's Included</p>
                  <div className="space-y-3 mb-10">
                    {prog.includes.map((item) => (
                      <motion.div
                        key={item}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(92,107,87,0.1)" }}
                        >
                          <Check size={11} style={{ color: "#5C6B57" }} />
                        </div>
                        <span className="text-sm" style={{ color: "#7A7771" }}>{item}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    className="w-full py-4 rounded-xl text-sm tracking-[0.14em] uppercase relative overflow-hidden"
                    style={{
                      background: enrolled ? "#5C6B57" : prog.featured ? "#5C6B57" : "transparent",
                      color: enrolled ? "#F6F4EF" : prog.featured ? "#F6F4EF" : "#5C6B57",
                      border: `1px solid ${(enrolled || prog.featured) ? "#5C6B57" : "#D4CCBF"}`,
                    }}
                    whileHover={{
                      background: "#5C6B57",
                      color: "#F6F4EF",
                      borderColor: "#5C6B57",
                      boxShadow: "0 6px 24px rgba(92,107,87,0.2)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => onEnroll(prog)}
                  >
                    {enrolled ? "Access Program →" : `Begin ${prog.title}`}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProgramsInner() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const [modal, setModal] = useState<{ open: boolean; prog: Program | null }>({ open: false, prog: null });

  // Auto-open modal if ?buy=30 (or 60/90) is in URL after auth redirect
  useEffect(() => {
    const buyParam = searchParams.get("buy");
    if (!buyParam || !user) return;
    const prog = programs.find(p => p.days === buyParam);
    if (prog) {
      setModal({ open: true, prog });
      // Clean the URL so refresh doesn't re-open
      router.replace("/programs");
    }
  }, [searchParams, user, router]);

  const isEnrolled = (prog: Program) => {
    if (!userProfile) return false;
    return userProfile.programId === prog.days;
  };

  const handleEnrollClick = (prog: Program) => {
    if (!user) {
      // Not logged in — redirect to signup with buy intent
      router.push(`/auth/signup?program=${prog.days}&action=buy`);
      return;
    }
    if (isEnrolled(prog)) {
      // Already enrolled — go to dashboard
      router.push("/dashboard");
      return;
    }
    // Logged in, not enrolled — open payment modal
    setModal({ open: true, prog });
  };

  return (
    <main>
      <Navbar />

      {/* Hero */}
      <section
        className="relative pt-40 pb-20 px-6"
        style={{ background: "#F6F4EF" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(92,107,87,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-3xl mx-auto text-center relative z-10" ref={headerRef}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : {}}
          >
            Programs
          </motion.p>
          <motion.h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              fontWeight: 300,
              color: "#2C2B29",
              lineHeight: 1.15,
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.15 }}
          >
            Your path. Your pace.<br />
            <em>Your transformation.</em>
          </motion.h1>
          <motion.p
            className="mt-6 text-base leading-relaxed max-w-lg mx-auto"
            style={{ color: "#7A7771", fontWeight: 300 }}
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Three structured journeys. Each one complete. Each one a doorway deeper.
          </motion.p>
        </div>
      </section>

      {/* Programs */}
      <section className="py-16 pb-32 px-6" style={{ background: "#F6F4EF" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          {programs.map((p, i) => (
            <ProgramCard
              key={p.days}
              prog={p}
              i={i}
              onEnroll={handleEnrollClick}
              enrolled={isEnrolled(p)}
            />
          ))}
        </div>
      </section>

      <Footer />

      {/* Payment modal — rendered conditionally so it unmounts on close */}
      {modal.open && modal.prog && (
        <PaymentModal
          onClose={() => setModal({ open: false, prog: null })}
          programId={modal.prog.days}
          programTitle={modal.prog.title}
          durationDays={Number(modal.prog.days)}
          price={modal.prog.priceNum}
        />
      )}
    </main>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={null}>
      <ProgramsInner />
    </Suspense>
  );
}
