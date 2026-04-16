"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Instagram, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const COMPANY_LINKS = [
  { href: "mailto:info@atmava.com", text: "Contact" },
  { href: "/privacy",  text: "Privacy" },
  { href: "/terms",    text: "Terms" },
  { href: "/cookies",  text: "Cookies" },
];

const PILLARS = ["Awareness", "Stillness", "Presence", "Mastery"];

export function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { user } = useAuth();

  const ctaHref  = user ? "/dashboard" : "/auth/signup";
  const ctaLabel = user ? "Go to Dashboard" : "Begin Your Journey";

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: "#2C2B29" }}
    >
      {/* Ambient top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse at center top, rgba(92,107,87,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Upper section */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-12 md:gap-8">

          {/* Brand column */}
          <div>
            <motion.span
              className="block mb-4 tracking-[0.2em] uppercase"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "2rem",
                color: "#F6F4EF",
                fontWeight: 300,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              Atmava
            </motion.span>

            <motion.p
              className="text-sm leading-[1.8] mb-7"
              style={{ color: "rgba(246,244,239,0.45)", maxWidth: "240px", fontWeight: 300 }}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              A sacred space for those ready to return to themselves. Not self-improvement — self-recognition.
            </motion.p>

            {/* Instagram */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.25 }}
            >
              <motion.a
                href="https://www.instagram.com/atmava.way"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex items-center gap-2"
                style={{ color: "rgba(246,244,239,0.45)" }}
                whileHover={{ color: "#F6F4EF" }}
                transition={{ duration: 0.2 }}
              >
                <Instagram size={15} />
              </motion.a>
            </motion.div>

            {/* Pillars */}
            <motion.div
              className="flex flex-wrap gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
            >
              {PILLARS.map((p, i) => (
                <motion.span
                  key={p}
                  className="text-[10px] tracking-[0.22em] uppercase px-2.5 py-1 rounded-full"
                  style={{
                    color: "rgba(246,244,239,0.4)",
                    border: "1px solid rgba(246,244,239,0.1)",
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  {p}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Practice column — single CTA button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            <p className="text-[10px] tracking-[0.3em] uppercase mb-5" style={{ color: "#7A8C74" }}>
              Practice
            </p>
            <Link href={ctaHref} className="flex items-center gap-1">
              <motion.span
                className="text-sm"
                style={{ color: "rgba(246,244,239,0.45)", fontWeight: 300 }}
                whileHover={{ color: "#F6F4EF", x: 2 }}
                transition={{ duration: 0.2 }}
              >
                {ctaLabel}
              </motion.span>
            </Link>
          </motion.div>

          {/* Company column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <p className="text-[10px] tracking-[0.3em] uppercase mb-5" style={{ color: "#7A8C74" }}>
              Company
            </p>
            <div className="flex flex-col gap-3">
              {COMPANY_LINKS.map(({ href, text }) => {
                const isExternal = href.startsWith("mailto") || href.startsWith("http");
                return (
                  <motion.div key={text} className="group flex items-center gap-1" whileHover="hover">
                    {isExternal ? (
                      <a href={href} className="flex items-center gap-1">
                        <motion.span
                          className="text-sm"
                          style={{ color: "rgba(246,244,239,0.45)", fontWeight: 300 }}
                          variants={{ hover: { color: "#F6F4EF", x: 2 } }}
                          transition={{ duration: 0.2 }}
                        >
                          {text}
                        </motion.span>
                        <motion.div variants={{ hover: { opacity: 1, x: 2 } }} initial={{ opacity: 0 }}>
                          <ArrowUpRight size={11} style={{ color: "#7A8C74" }} />
                        </motion.div>
                      </a>
                    ) : (
                      <Link href={href} className="flex items-center gap-1">
                        <motion.span
                          className="text-sm"
                          style={{ color: "rgba(246,244,239,0.45)", fontWeight: 300 }}
                          variants={{ hover: { color: "#F6F4EF", x: 2 } }}
                          transition={{ duration: 0.2 }}
                        >
                          {text}
                        </motion.span>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Separator */}
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          className="h-px"
          style={{ background: "rgba(246,244,239,0.07)" }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.4 }}
        />
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-7">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <motion.p
            className="text-xs"
            style={{ color: "rgba(246,244,239,0.25)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
          >
            © {new Date().getFullYear()} Atmava. All rights reserved.
          </motion.p>

          <motion.p
            className="text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "rgba(246,244,239,0.2)" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
          >
            Awareness · Stillness · Mastery
          </motion.p>

          <motion.p
            className="text-xs"
            style={{ color: "rgba(246,244,239,0.25)", letterSpacing: "0.04em" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.65 }}
          >
            Made with intention.
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
