"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Video, Sun, CalendarCheck, Users } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Live Sessions",
    desc: "Daily live group classes with experienced guides, Monday through Saturday.",
  },
  {
    icon: Sun,
    title: "Two Batches",
    desc: "Morning and evening batches so you practice at the time that suits you best.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance Tracking",
    desc: "Your daily attendance is recorded so your mentor can support your consistency.",
  },
  {
    icon: Users,
    title: "Mentor Guidance",
    desc: "A dedicated mentor guides your program, tracks your progress, and holds the space.",
  },
];

export function ExperienceSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-32 px-6" style={{ background: "#E8E1D6" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20" ref={ref}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            The Experience
          </motion.p>
          <motion.h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#2C2B29",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            Everything you need,<br />
            <em>nothing you don't</em>
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                className="relative p-8 rounded-2xl group"
                style={{
                  background: "#F6F4EF",
                  border: "1px solid #D4CCBF",
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{
                  y: -6,
                  borderColor: "rgba(92,107,87,0.4)",
                  boxShadow: "0 16px 48px rgba(44,43,41,0.1)",
                }}
                suppressHydrationWarning
              >
                {/* Top accent */}
                <motion.div
                  className="absolute top-0 left-8 right-8 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(92,107,87,0.25), transparent)", transformOrigin: "left" }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.1 + 0.3 }}
                  suppressHydrationWarning
                />

                <motion.div
                  className="mb-6 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(92,107,87,0.1)", border: "1px solid rgba(92,107,87,0.18)" }}
                  whileHover={{ scale: 1.08, background: "rgba(92,107,87,0.16)" }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon size={20} style={{ color: "#5C6B57" }} />
                </motion.div>

                <h3
                  className="mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400, color: "#2C2B29" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>
                  {feat.desc}
                </p>

                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: "radial-gradient(ellipse at 40% 0%, rgba(92,107,87,0.07) 0%, transparent 65%)",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
