"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PaymentModal } from "@/components/PaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import { getPrograms } from "@/lib/firestore";
import type { Program } from "@/types";
import { ChevronDown, Check } from "lucide-react";

function ProgramCard({
  prog,
  i,
  onEnroll,
  enrolled,
}: {
  prog: Program;
  i: number;
  onEnroll: (prog: Program) => void;
  enrolled: boolean;
}) {
  const [open, setOpen] = useState(i === 0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const displayPrice = `₹${(prog.price / 100).toLocaleString("en-IN")}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        border: "1px solid #D4CCBF",
        background: "#F6F4EF",
      }}
    >
      {/* Header */}
      <button
        className="w-full p-8 text-left flex items-start justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <div>
          <span className="text-xs tracking-[0.22em] uppercase block mb-2" style={{ color: "#5C6B57" }}>
            {prog.duration} Days
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
          {prog.batches?.length > 0 && (
            <p className="text-sm mt-1" style={{ color: "#7A7771", fontStyle: "italic" }}>
              {prog.batches.map(b => `${b.name} ${b.time}`).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#2C2B29", fontWeight: 300 }}>
            {displayPrice}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
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
                {prog.description}
              </p>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Batches & Levels */}
                <div>
                  {prog.batches?.length > 0 && (
                    <>
                      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "#5C6B57" }}>Batches</p>
                      <div className="space-y-3 mb-8">
                        {prog.batches.map(b => (
                          <div key={b.name} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(92,107,87,0.1)" }}>
                              <Check size={11} style={{ color: "#5C6B57" }} />
                            </div>
                            <span className="text-sm" style={{ color: "#7A7771" }}>{b.name} — {b.time}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {prog.levels?.length > 0 && (
                    <>
                      <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "#5C6B57" }}>Levels</p>
                      <div className="flex flex-wrap gap-2">
                        {prog.levels.map(l => (
                          <span
                            key={l}
                            className="text-xs px-3 py-1.5 rounded-full"
                            style={{ background: "rgba(92,107,87,0.08)", color: "#5C6B57", border: "1px solid rgba(92,107,87,0.2)" }}
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* What&apos;s Included + CTA */}
                <div>
                  {prog.features?.length > 0 && (
                    <>
                      <p className="text-xs tracking-widest uppercase mb-6" style={{ color: "#5C6B57" }}>What&apos;s Included</p>
                      <div className="space-y-3 mb-10">
                        {prog.features.map(item => (
                          <motion.div
                            key={item}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                          >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(92,107,87,0.1)" }}>
                              <Check size={11} style={{ color: "#5C6B57" }} />
                            </div>
                            <span className="text-sm" style={{ color: "#7A7771" }}>{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  <motion.button
                    className="w-full py-4 rounded-xl text-sm tracking-[0.14em] uppercase relative overflow-hidden"
                    style={{
                      background: enrolled ? "#5C6B57" : "transparent",
                      color: enrolled ? "#F6F4EF" : "#5C6B57",
                      border: `1px solid ${enrolled ? "#5C6B57" : "#D4CCBF"}`,
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

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; prog: Program | null }>({ open: false, prog: null });

  useEffect(() => {
    getPrograms()
      .then(progs => {
        setPrograms(progs.filter(p => p.isActive).sort((a, b) => a.duration - b.duration));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-open modal if ?buy=<programId> is in URL after auth redirect
  useEffect(() => {
    if (loading) return;
    const buyParam = searchParams.get("buy");
    if (!buyParam || !user) return;
    const prog = programs.find(p => p.id === buyParam);
    if (prog) {
      setModal({ open: true, prog });
      router.replace("/programs");
    }
  }, [searchParams, user, router, programs, loading]);

  const isEnrolled = (prog: Program) => {
    if (!userProfile) return false;
    return userProfile.programId === prog.id;
  };

  const handleEnrollClick = (prog: Program) => {
    if (!user) {
      router.push(`/auth/signup?program=${prog.id}&action=buy`);
      return;
    }
    if (isEnrolled(prog)) {
      router.push("/dashboard");
      return;
    }
    setModal({ open: true, prog });
  };

  return (
    <main>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-40 pb-20 px-6" style={{ background: "#F6F4EF" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(92,107,87,0.08) 0%, transparent 60%)" }}
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
            Live daily sessions with a dedicated mentor. Morning and evening batches. Mon–Sat.
          </motion.p>
        </div>
      </section>

      {/* Programs */}
      <section className="py-16 pb-32 px-6" style={{ background: "#F6F4EF" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#5C6B57" }}
              />
            </div>
          ) : programs.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#7A7771", fontWeight: 300 }}>
                Programs coming soon.
              </p>
            </motion.div>
          ) : (
            programs.map((p, i) => (
              <ProgramCard
                key={p.id}
                prog={p}
                i={i}
                onEnroll={handleEnrollClick}
                enrolled={isEnrolled(p)}
              />
            ))
          )}
        </div>
      </section>

      <Footer />

      {modal.open && modal.prog && (
        <PaymentModal
          onClose={() => setModal({ open: false, prog: null })}
          programId={modal.prog.id}
          programTitle={modal.prog.title}
          durationDays={modal.prog.duration}
          price={Math.round(modal.prog.price / 100)}
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
