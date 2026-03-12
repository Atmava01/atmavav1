"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Instagram, Youtube, Twitter, Mail, ArrowUpRight } from "lucide-react";

const NAV_COLS = [
  {
    label: "Journey",
    links: [
      { href: "/", text: "Home" },
      { href: "/about", text: "About" },
      { href: "/programs", text: "Programs" },
      { href: "/programs#faq", text: "FAQ" },
    ],
  },
  {
    label: "Practice",
    links: [
      { href: "/auth/signup", text: "Begin Now" },
      { href: "/auth/login", text: "Sign In" },
      { href: "/dashboard", text: "Dashboard" },
      { href: "/dashboard", text: "My Sessions" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", text: "Our Philosophy" },
      { href: "/about#team", text: "The Team" },
      { href: "/about#mentors", text: "Mentors" },
      { href: "mailto:hello@atmava.com", text: "Contact" },
    ],
  },
];

const SOCIALS = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com" },
  { icon: Youtube,   label: "YouTube",   href: "https://youtube.com" },
  { icon: Twitter,   label: "Twitter",   href: "https://twitter.com" },
  { icon: Mail,      label: "Email",     href: "mailto:hello@atmava.com" },
];

const PILLARS = ["Awareness", "Stillness", "Presence", "Mastery"];

export function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

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
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 md:gap-8">

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

            {/* Socials */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
            >
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <motion.a
                  key={label}
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(246,244,239,0.06)",
                    border: "1px solid rgba(246,244,239,0.08)",
                    color: "rgba(246,244,239,0.45)",
                  }}
                  whileHover={{
                    background: "rgba(92,107,87,0.2)",
                    borderColor: "rgba(92,107,87,0.4)",
                    color: "#7A8C74",
                    scale: 1.05,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon size={14} />
                </motion.a>
              ))}
            </motion.div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map((col, ci) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.12 + ci * 0.08 }}
            >
              <p className="text-[10px] tracking-[0.3em] uppercase mb-5" style={{ color: "#7A8C74" }}>
                {col.label}
              </p>
              <div className="flex flex-col gap-3">
                {col.links.map(({ href, text }) => {
                  const isExternal = href.startsWith("mailto") || href.startsWith("http");
                  return (
                    <motion.div
                      key={text}
                      className="group flex items-center gap-1"
                      whileHover="hover"
                    >
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
          ))}
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

          <motion.div
            className="flex gap-5"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.65 }}
          >
            {[["Privacy", "#"], ["Terms", "#"], ["Cookies", "#"]].map(([label, href]) => (
              <Link key={label} href={href}>
                <motion.span
                  className="text-xs"
                  style={{ color: "rgba(246,244,239,0.25)" }}
                  whileHover={{ color: "rgba(246,244,239,0.6)" }}
                  transition={{ duration: 0.2 }}
                >
                  {label}
                </motion.span>
              </Link>
            ))}
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
