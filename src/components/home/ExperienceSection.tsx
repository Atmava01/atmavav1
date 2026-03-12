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
        {/* Header */}
        <div className="text-center mb-20" ref={ref}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
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
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Everything you need,<br />
            <em>nothing you don't</em>
          </motion.h2>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                className="relative p-8 rounded-2xl group"
                style={{
                  background: "rgba(246,244,239,0.5)",
                  border: "1px solid rgba(212,204,191,0.6)",
                  backdropFilter: "blur(8px)",
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{
                  y: -5,
                  borderColor: "rgba(92,107,87,0.3)",
                  boxShadow: "0 12px 32px rgba(44,43,41,0.08)",
                }}
              >
                {/* Icon wrapper */}
                <motion.div
                  className="mb-6 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(92,107,87,0.08)", border: "1px solid rgba(92,107,87,0.15)" }}
                  whileHover={{ scale: 1.1, background: "rgba(92,107,87,0.14)" }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon size={20} style={{ color: "#5C6B57" }} />
                </motion.div>

                <h3
                  className="mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400, color: "#2C2B29" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#7A7771", fontWeight: 300 }}>
                  {feat.desc}
                </p>

                {/* Hover reveal glow */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  style={{
                    background: "radial-gradient(circle at 30% 0%, rgba(92,107,87,0.06) 0%, transparent 60%)",
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
