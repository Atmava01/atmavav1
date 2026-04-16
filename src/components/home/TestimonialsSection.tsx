"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { getLandingTestimonials, type LandingTestimonial } from "@/lib/firestore";

const FALLBACK: LandingTestimonial[] = [
  { id: "1", quote: "The 60-day program completely transformed how I relate to my mind. For the first time, I can sit in stillness without running from myself.", name: "Priya S.", detail: "60-Day Program · Morning Batch", initials: "PS" },
  { id: "2", quote: "I came in skeptical. I left with a practice that has stayed with me every single day. The live sessions with the mentor made all the difference.", name: "Arjun M.", detail: "90-Day Program · Evening Batch", initials: "AM" },
  { id: "3", quote: "Atmava gave me tools I didn't know I needed. My anxiety has reduced, my focus is sharper, and I feel genuinely at peace with who I am.", name: "Sneha R.", detail: "60-Day Program · Morning Batch", initials: "SR" },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>(FALLBACK);

  useEffect(() => {
    getLandingTestimonials().then(data => {
      if (data.length > 0) setTestimonials(data);
    }).catch(() => {});
  }, []);

  return (
    <section
      ref={ref}
      className="py-28 px-6 relative overflow-hidden"
      style={{ background: "#EDEAE3" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "700px", height: "400px",
          background: "radial-gradient(ellipse at center top, rgba(92,107,87,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            Voices from the Practice
          </motion.p>
          <motion.h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 300,
              color: "#2C2B29",
              lineHeight: 1.2,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            What seekers are saying
          </motion.h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="rounded-2xl p-7 flex flex-col gap-5"
              style={{
                background: "#F6F4EF",
                border: "1px solid #D4CCBF",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}
              whileHover={{ y: -4, boxShadow: "0 8px 32px rgba(44,43,41,0.07)", borderColor: "#5C6B57" }}
            >
              {/* Quote mark */}
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "3.5rem",
                  lineHeight: 0.8,
                  color: "rgba(92,107,87,0.2)",
                  display: "block",
                }}
              >
                "
              </span>

              <p
                className="text-sm leading-[1.85] flex-1"
                style={{ color: "#4A4845", fontWeight: 300, fontStyle: "italic" }}
              >
                {t.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid #D4CCBF" }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 select-none"
                  style={{ background: "rgba(92,107,87,0.15)", color: "#5C6B57", fontWeight: 500 }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: "#4A4845" }}>{t.detail}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
