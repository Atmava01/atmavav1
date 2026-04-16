"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MentorsSection } from "@/components/home/MentorsSection";

const timeline = [
  { year: "2019", event: "The Seed", desc: "Atmava was born from a single question: why do so few people find lasting inner peace?" },
  { year: "2020", event: "The Silence", desc: "A year of deep research into contemplative traditions, neuroscience, and consciousness studies." },
  { year: "2021", event: "The Form", desc: "The first program was crafted — 30 days, 12 participants, transformative results." },
  { year: "2023", event: "The Expansion", desc: "3,000 practitioners later, Atmava's methodology was refined and made accessible worldwide." },
  { year: "2025", event: "Now", desc: "You are here. The door is open." },
];

function TimelineItem({ item, i }: { item: typeof timeline[0]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="flex gap-8 items-start">
      {/* Left - year + line */}
      <div className="flex flex-col items-center" style={{ minWidth: "60px" }}>
        <motion.div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: i === timeline.length - 1 ? "#5C6B57" : "#D4CCBF", border: "2px solid #5C6B57" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1 }}
        />
        {i < timeline.length - 1 && (
          <motion.div
            className="mt-2 w-px"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={inView ? { scaleY: 1, opacity: 1 } : {}}
            transition={{ duration: 0.35, delay: i * 0.04 + 0.08 }}
            style={{ transformOrigin: "top", background: "#D4CCBF", minHeight: "60px", width: "1px" }}
          />
        )}
      </div>

      {/* Right - content */}
      <motion.div
        className="pb-10"
        initial={{ opacity: 0, x: -20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.3, delay: i * 0.04 + 0.05 }}
      >
        <span className="text-xs tracking-widest uppercase block mb-1" style={{ color: "#5C6B57" }}>{item.year}</span>
        <h3
          className="mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400, color: "#2C2B29" }}
        >
          {item.event}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>{item.desc}</p>
      </motion.div>
    </div>
  );
}

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const missionRef = useRef(null);
  const missionInView = useInView(missionRef, { once: true, margin: "-80px" });

  const timelineRef = useRef(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: "-80px" });

  return (
    <main>
      <Navbar />

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative flex items-center justify-center overflow-hidden pt-32 pb-24"
        style={{ minHeight: "70vh", background: "#F6F4EF" }}
      >
        {/* Ambient */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ y: heroY }}
        >
          <div
            className="absolute blur-[140px]"
            style={{
              width: "700px", height: "500px",
              background: "radial-gradient(ellipse, rgba(92,107,87,0.1) 0%, transparent 70%)",
              top: "-100px", left: "50%", transform: "translateX(-50%)",
            }}
          />
        </motion.div>

        <div className="relative z-10 text-center px-6 max-w-3xl">
          <p
            className="text-xs tracking-[0.28em] uppercase mb-6"
            style={{ color: "#5C6B57" }}
          >
            Our Story
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(3rem, 7vw, 6rem)",
              fontWeight: 300,
              color: "#2C2B29",
              lineHeight: 1.1,
            }}
          >
            Born from<br />
            <em>the silence</em>
          </h1>
          <p
            className="mt-6 text-base leading-relaxed max-w-lg mx-auto"
            style={{ color: "#4A4845", fontWeight: 300 }}
          >
            Atmava was created for those who sense there is something deeper — and are ready to discover it.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-32 px-6" style={{ background: "#E8E1D6" }}>
        <div className="max-w-3xl mx-auto" ref={missionRef}>
          <motion.p
            className="text-xs tracking-[0.28em] uppercase mb-10"
            style={{ color: "#5C6B57" }}
            initial={{ opacity: 0 }}
            animate={missionInView ? { opacity: 1 } : {}}
          >
            Mission
          </motion.p>

          {[
            "We believe that the most radical act in the modern world is to stop.",
            "To sit. To listen. To return to what is real.",
            "Atmava exists to create the conditions for that return — through sacred structure, expert guidance, and a community of seekers who hold each other accountable to their highest nature.",
            "Not productivity. Not performance. Presence.",
          ].map((para, i) => (
            <motion.p
              key={i}
              className="mb-6"
              style={{
                fontFamily: i < 2 ? "'Cormorant Garamond', serif" : "Inter, sans-serif",
                fontSize: i < 2 ? "clamp(1.5rem, 3vw, 2.2rem)" : "1rem",
                fontWeight: 300,
                color: i < 2 ? "#2C2B29" : "#4A4845",
                lineHeight: i < 2 ? 1.35 : 1.8,
                fontStyle: i === 1 ? "italic" : "normal",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={missionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
            >
              {para}
            </motion.p>
          ))}
        </div>
      </section>

      {/* Values grid */}
      <section id="team" className="py-28 px-6" style={{ background: "#F6F4EF" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-px" style={{ border: "1px solid #D4CCBF", borderRadius: "16px", overflow: "hidden" }}>
            {[
              { label: "Awareness", desc: "See what is, without distortion or judgment." },
              { label: "Stillness", desc: "The ground of all clarity and creative power." },
              { label: "Mastery", desc: "Not control — but the freedom that comes from deep knowing." },
            ].map((v, i) => (
              <motion.div
                key={v.label}
                className="p-10"
                style={{ background: "#F6F4EF", borderRight: i < 2 ? "1px solid #D4CCBF" : "none" }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ background: "#E8E1D6" }}
              >
                <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "#5C6B57" }}>0{i + 1}</p>
                <h3
                  className="mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 400, color: "#2C2B29" }}
                >
                  {v.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#4A4845", fontWeight: 300 }}>{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-32 px-6" style={{ background: "#E8E1D6" }}>
        <div className="max-w-2xl mx-auto">
          <div ref={timelineRef}>
            <motion.p
              className="text-xs tracking-[0.28em] uppercase mb-4"
              style={{ color: "#5C6B57" }}
              initial={{ opacity: 0 }}
              animate={timelineInView ? { opacity: 1 } : {}}
            >
              Journey
            </motion.p>
            <motion.h2
              className="mb-16"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 300,
                color: "#2C2B29",
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={timelineInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              How we arrived here
            </motion.h2>
          </div>

          {timeline.map((item, i) => (
            <TimelineItem key={item.year} item={item} i={i} />
          ))}
        </div>
      </section>

      <div id="mentors">
        <MentorsSection />
      </div>

      {/* CTA */}
      <section className="py-32 px-6 relative overflow-hidden" style={{ background: "#2C2B29" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(92,107,87,0.15) 0%, transparent 65%)" }}
        />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <p className="text-xs tracking-[0.28em] uppercase mb-6" style={{ color: "#7A8C74" }}>
            Begin Now
          </p>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.4rem, 5vw, 4rem)",
              fontWeight: 300,
              color: "#F6F4EF",
              lineHeight: 1.2,
              marginBottom: "1.5rem",
            }}
          >
            Ready to return<br />
            <em>to yourself?</em>
          </h2>
          <p className="text-sm leading-relaxed mb-12 max-w-md mx-auto" style={{ color: "rgba(246,244,239,0.5)", fontWeight: 300 }}>
            60 and 90-day guided programs. Live daily sessions. Morning and evening batches.
          </p>
          <Link href="/programs">
            <motion.button
              className="px-10 py-4 text-sm tracking-[0.18em] uppercase rounded-2xl"
              style={{ background: "#5C6B57", color: "#F6F4EF", border: "1px solid #5C6B57" }}
              whileHover={{ background: "#4A5645", boxShadow: "0 8px 32px rgba(92,107,87,0.3)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              Begin Your Practice →
            </motion.button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
