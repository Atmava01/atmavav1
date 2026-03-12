"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const mentors = [
  {
    name: "Jagadish",
    paras: [
      "Jagadish is a dedicated trainer at Ātmava, guiding individuals through the deeper dialogue between Soma and Manas, the body's innate intelligence and the mind's quiet clarity. With a grounded, experiential approach, he helps participants reconnect with their physical sensations, emotional patterns, and mental stillness, creating space for realignment and inner balance.",
      "His sessions blend mindful movement, breathwork, and contemplative practices, encouraging people to listen to the body as a teacher while cultivating a calmer, steadier mind. Jagadish's focus is not on performance or perfection, but on presence — helping each person discover a more harmonious relationship between what the body feels and what the mind experiences.",
      "Through his work at Ātmava, he supports individuals on a journey of self-awareness, healing, and integration, making the principles of Soma and Manas accessible in everyday living.",
    ],
  },
  {
    name: "Leeza Chandy",
    paras: [
      "Leeza brings a warm, intuitive presence to Ātmava, offering a practice that gently bridges movement, awareness, and emotional grounding. Her work is centred on helping individuals reconnect with themselves through subtle bodywork, conscious breath, and mindful pauses that create space for reflection and release.",
      "With a natural ability to sense the needs of a group, Leeza designs sessions that are supportive, fluid, and deeply personal. She encourages participants to slow down, notice their inner rhythms, and build a more compassionate connection with their physical and emotional wellbeing.",
      "Leeza's approach blends sensitivity with clarity — making her sessions both calming and transformative. Through her guidance, individuals learn to tune into themselves with honesty, softness, and renewed presence.",
    ],
  },
];

/** Individual mentor card — each gets its own hook-safe ref */
function MentorCard({ mentor, delay }: { mentor: typeof mentors[0]; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="relative p-8 lg:p-10 rounded-2xl"
      style={{
        background: "rgba(246,244,239,0.6)",
        border: "1px solid rgba(212,204,191,0.7)",
      }}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{
        y: -4,
        borderColor: "rgba(92,107,87,0.25)",
        boxShadow: "0 16px 48px rgba(44,43,41,0.07)",
      }}
    >
      {/* Subtle top accent line */}
      <motion.div
        className="absolute top-0 left-10 right-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(92,107,87,0.3), transparent)" }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={inView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1, delay: delay + 0.15 }}
      />

      {/* Name */}
      <motion.h3
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
          fontWeight: 300,
          color: "#2C2B29",
          marginBottom: "0.5rem",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: delay + 0.1 }}
      >
        {mentor.name}
      </motion.h3>

      {/* Thin green separator */}
      <motion.div
        style={{
          width: "32px",
          height: "1px",
          background: "#5C6B57",
          marginBottom: "1.5rem",
          opacity: 0.5,
          transformOrigin: "left",
        }}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, delay: delay + 0.25 }}
      />

      {/* Bio paragraphs */}
      <div className="space-y-4">
        {mentor.paras.map((para, j) => (
          <motion.p
            key={j}
            className="text-sm leading-[1.9]"
            style={{ color: "#7A7771", fontWeight: 300 }}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: delay + 0.3 + j * 0.1 }}
          >
            {para}
          </motion.p>
        ))}
      </div>

      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          background: "radial-gradient(ellipse at 50% 100%, rgba(92,107,87,0.05) 0%, transparent 65%)",
        }}
      />
    </motion.div>
  );
}

export function MentorsSection() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="py-32 px-6 relative overflow-hidden" style={{ background: "#F6F4EF" }}>
      {/* Top divider */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ transformOrigin: "top", width: "1px", height: "80px", background: "#D4CCBF" }}
      />

      <div className="max-w-5xl mx-auto pt-10">
        {/* Header */}
        <div className="text-center mb-20" ref={headerRef}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-4"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
          >
            The Guides
          </motion.p>
          <motion.h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#2C2B29",
              lineHeight: 1.2,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            Those who hold<br />
            <em>the space</em>
          </motion.h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {mentors.map((mentor, i) => (
            <MentorCard key={mentor.name} mentor={mentor} delay={i * 0.12} />
          ))}
        </div>
      </div>

      {/* Bottom divider */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        style={{ transformOrigin: "bottom", width: "1px", height: "80px", background: "#D4CCBF" }}
      />
    </section>
  );
}
