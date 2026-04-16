"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PaymentModal } from "@/components/PaymentModal";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { useAuth } from "@/contexts/AuthContext";
import { getPrograms } from "@/lib/firestore";
import type { Program } from "@/types";
import { ChevronDown, Check } from "lucide-react";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #D4CCBF" }}>
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm md:text-base" style={{ color: "#2C2B29", fontWeight: 300 }}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={16} style={{ color: "#4A4845" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgramCard({
  prog,
  i,
  onEnroll,
  enrolled,
  badge,
}: {
  prog: Program;
  i: number;
  onEnroll: (prog: Program) => void;
  enrolled: boolean;
  badge?: "most-popular" | "best-value";
}) {
  const [open, setOpen] = useState(i === 0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const displayPrice = `₹${prog.price.toLocaleString("en-IN")}`;
  const perDay = prog.duration > 0 ? (prog.price / prog.duration).toFixed(2) : null;

  const badgeLabel  = badge === "most-popular" ? "Most Popular" : badge === "best-value" ? "Best Value" : null;
  const badgeColors = badge === "most-popular"
    ? { bg: "#5C6B57",              text: "#F6F4EF" }
    : { bg: "rgba(92,107,87,0.12)", text: "#5C6B57" };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.35, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        border: badge ? "1.5px solid rgba(92,107,87,0.35)" : "1px solid #D4CCBF",
        background: "#F6F4EF",
      }}
    >
      {/* Badge strip */}
      {badgeLabel && (
        <div
          className="w-full px-8 py-2 flex items-center gap-2"
          style={{ background: badgeColors.bg, borderBottom: "1px solid rgba(92,107,87,0.15)" }}
        >
          <span
            className="text-[10px] tracking-[0.22em] uppercase font-medium"
            style={{ color: badgeColors.text }}
          >
            {badgeLabel}
          </span>
        </div>
      )}

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
            <p className="text-sm mt-1" style={{ color: "#4A4845", fontStyle: "italic" }}>
              {prog.batches.map(b => `${b.name} ${b.time}`).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#2C2B29", fontWeight: 300, display: "block" }}>
              {displayPrice}
            </span>
            {perDay && (
              <span className="text-xs" style={{ color: "#4A4845" }}>
                ₹{perDay}/day
              </span>
            )}
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={18} style={{ color: "#4A4845" }} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 border-t" style={{ borderColor: "#D4CCBF" }}>
              <p className="text-sm leading-relaxed pt-6 mb-10" style={{ color: "#4A4845", fontWeight: 300 }}>
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
                            <span className="text-sm" style={{ color: "#4A4845" }}>{b.name} — {b.time}</span>
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
                            <span className="text-sm" style={{ color: "#4A4845" }}>{item}</span>
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
            transition={{ duration: 0.35, delay: 0.06 }}
          >
            Your path. Your pace.<br />
            <em>Your transformation.</em>
          </motion.h1>
          <motion.p
            className="mt-6 text-base leading-relaxed max-w-lg mx-auto"
            style={{ color: "#4A4845", fontWeight: 300 }}
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.1 }}
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
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#4A4845", fontWeight: 300 }}>
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
                badge={p.badge ?? undefined}
              />
            ))
          )}
        </div>
      </section>

      <TestimonialsSection />

      {/* FAQ */}
      <section id="faq" className="py-28 px-6" style={{ background: "#E8E1D6" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.28em] uppercase mb-4" style={{ color: "#5C6B57" }}>FAQ</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, color: "#2C2B29", marginBottom: "3rem" }}>
            Common questions
          </h2>
          <div className="space-y-0" style={{ borderTop: "1px solid #D4CCBF" }}>
            {[
              { q: "What does a typical day look like?", a: "Each day includes a live session with your mentor — either in the morning or evening batch (Mon–Sat). Sessions blend meditation, breathwork, movement, and reflection. You choose the batch that fits your schedule." },
              { q: "Do I need prior experience?", a: "No. Atmava programs are designed for all levels. Whether you are completely new to contemplative practice or returning after years, the program meets you where you are." },
              { q: "What if I miss a session?", a: "Life happens. While consistent attendance deepens your practice, your mentor will keep you informed and supported throughout the program." },
              { q: "How are payments handled?", a: "Payments are processed securely via Razorpay. Your enrollment is confirmed immediately after payment. All transactions are in INR." },
              { q: "Can I switch batches after enrolling?", a: "Batch changes may be accommodated depending on availability. Please reach out to us at hello@atmava.com." },
              { q: "Is there a refund policy?", a: "Please contact hello@atmava.com within 48 hours of enrollment if you need to discuss your enrollment. Refund decisions are made on a case-by-case basis." },
            ].map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {modal.open && modal.prog && (
        <PaymentModal
          onClose={() => setModal({ open: false, prog: null })}
          programId={modal.prog.id}
          programTitle={modal.prog.title}
          durationDays={modal.prog.duration}
          price={modal.prog.price}
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
