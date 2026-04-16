"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="cta"
      className="py-40 px-6 relative overflow-hidden"
      style={{ background: "#F6F4EF" }}
      ref={ref}
    >
      {/* Ambient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="absolute rounded-full blur-[160px]"
          style={{
            width: "500px", height: "500px",
            background: "radial-gradient(circle, rgba(92,107,87,0.1) 0%, transparent 70%)",
            top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          }}
        />
      </motion.div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <motion.p
          className="text-xs tracking-[0.28em] uppercase mb-6"
          style={{ color: "#5C6B57" }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3 }}
        >
          Begin Now
        </motion.p>

        <motion.h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
            fontWeight: 300,
            color: "#2C2B29",
            lineHeight: 1.15,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.08 }}
        >
          The path home<br />
          <em>is already within you</em>
        </motion.h2>

        <motion.p
          className="mt-6 mb-14 text-base leading-relaxed"
          style={{ color: "#4A4845", fontWeight: 300 }}
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          Join Atmava and begin the most meaningful journey of your life.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          <Link href="/auth/signup">
            <motion.button
              className="px-12 py-5 text-sm tracking-[0.18em] uppercase rounded-2xl relative overflow-hidden"
              style={{ background: "#5C6B57", color: "#F6F4EF", border: "none" }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(92,107,87,0.3)",
                  "0 0 28px 12px rgba(92,107,87,0)",
                  "0 0 0 0 rgba(92,107,87,0.3)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.04, boxShadow: "0 8px 32px rgba(92,107,87,0.3)" }}
              whileTap={{ scale: 0.97 }}
            >
              Begin Your Practice
            </motion.button>
          </Link>
        </motion.div>

        <motion.p
          className="mt-8 text-xs tracking-widest uppercase"
          style={{ color: "#4A4845" }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
        >
          Live sessions Mon–Sat · Morning & Evening batches
        </motion.p>
      </div>
    </section>
  );
}
