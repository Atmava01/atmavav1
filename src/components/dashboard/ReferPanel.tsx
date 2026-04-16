"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Share2, Gift, Tag, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function generateReferralCode(name: string, uid: string) {
  const prefix = name.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const suffix = uid.slice(-4).toUpperCase();
  return `${prefix}${suffix}`;
}

export function ReferPanel() {
  const { user, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const code = user && userProfile?.name
    ? generateReferralCode(userProfile.name, user.uid)
    : "———";

  const shareText = `Hey! I've been practising with Ātmava — a mindfulness & yoga platform with live daily sessions and a dedicated mentor.\n\nUse my referral code *${code}* when you enroll to get 5% off any program.\n\nCheck it out: https://atmava.com/programs`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>
          Refer &amp; Earn
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>Share Ātmava and give your friends 5% off</p>
      </div>

      {/* Hero */}
      <motion.div
        className="rounded-2xl p-7"
        style={{ background: "#1E1D1B" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(92,107,87,0.25)" }}>
            <Gift size={18} style={{ color: "#7A8C74" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#F6F4EF" }}>Your Referral Code</p>
            <p className="text-xs" style={{ color: "rgba(246,244,239,0.45)" }}>Share this with anyone ready to begin their practice</p>
          </div>
        </div>

        {/* Code block */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl mb-5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span
            className="text-3xl font-semibold tracking-[0.2em]"
            style={{ fontFamily: "monospace", color: "#F6F4EF" }}
          >
            {code}
          </span>
          <motion.button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0"
            style={{
              background: codeCopied ? "rgba(92,107,87,0.4)" : "rgba(255,255,255,0.1)",
              color: codeCopied ? "#7A8C74" : "rgba(246,244,239,0.7)",
            }}
            whileHover={{ background: "rgba(255,255,255,0.15)" }}
            whileTap={{ scale: 0.93 }}
          >
            <AnimatePresence mode="wait">
              {codeCopied ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                  <Check size={13} /> Copied
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                  <Copy size={13} /> Copy Code
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Discount callout */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(92,107,87,0.2)", border: "1px solid rgba(92,107,87,0.3)" }}
        >
          <Tag size={15} style={{ color: "#7A8C74", flexShrink: 0 }} />
          <p className="text-xs" style={{ color: "rgba(246,244,239,0.8)" }}>
            When your friend enters <span className="font-semibold text-white">{code}</span> at checkout, they get{" "}
            <span className="font-semibold" style={{ color: "#7A8C74" }}>5% off</span> any program — automatically applied.
          </p>
        </div>
      </motion.div>

      {/* Share buttons */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <p className="text-xs font-medium mb-4" style={{ color: "#2C2B29" }}>Share via</p>
        <div className="flex gap-3 flex-wrap">
          <motion.button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "#25D366", color: "#fff" }}
            whileHover={{ opacity: 0.88 }}
            whileTap={{ scale: 0.96 }}
          >
            <Share2 size={14} />
            WhatsApp
          </motion.button>
          <motion.button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "#F6F4EF", color: "#2C2B29", border: "1px solid #D4CCBF" }}
            whileHover={{ background: "#EDE8E0" }}
            whileTap={{ scale: 0.96 }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Message"}
          </motion.button>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        className="rounded-2xl p-5"
        style={{ background: "#fff", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
      >
        <p className="text-xs font-medium mb-5" style={{ color: "#2C2B29" }}>How it works</p>
        <div className="space-y-4">
          {[
            { step: "1", title: "Share your code", desc: "Send your unique referral code to a friend who wants to start their mindfulness journey." },
            { step: "2", title: "They enroll with 5% off", desc: `Your friend enters "${code}" at checkout and instantly gets 5% off any Ātmava program.` },
            { step: "3", title: "You both benefit", desc: "Every successful referral is tracked and rewards will be available on your next renewal." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5"
                style={{ background: "rgba(92,107,87,0.12)", color: "#5C6B57" }}
              >
                {step}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4A4845" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Terms */}
      <motion.div
        className="rounded-xl px-5 py-4"
        style={{ background: "rgba(92,107,87,0.06)", border: "1px solid rgba(92,107,87,0.15)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.24 }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "#4A4845" }}>
          <span className="font-medium" style={{ color: "#2C2B29" }}>Terms · </span>
          The 5% discount applies to the full price of any program at checkout. Codes cannot be stacked with other offers. Atmava reserves the right to modify or discontinue this program at any time.
        </p>
      </motion.div>
    </div>
  );
}
