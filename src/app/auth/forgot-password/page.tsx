"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function ForgotPasswordInner() {
  const { resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") setError("No account found with this email.");
      else setError("Failed to send reset email. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-10 rounded-2xl" style={{ background: "rgba(246,244,239,0.85)", border: "1px solid #D4CCBF", backdropFilter: "blur(20px)", boxShadow: "0 24px 60px rgba(44,43,41,0.07)" }}>
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-10">
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", fontWeight: 300, color: "#2C2B29" }}>Reset password</h1>
              <p className="text-sm mt-2" style={{ color: "#4A4845" }}>We'll send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#4A4845" }}>Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-300"
                  style={{ background: "#F6F4EF", border: `1px solid ${focused ? "#5C6B57" : "#D4CCBF"}`, color: "#2C2B29", boxShadow: focused ? "0 0 0 3px rgba(92,107,87,0.1)" : "none" }}
                  placeholder="you@example.com"
                />
              </div>

              <AnimatePresence>
                {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="text-sm px-4 py-3 rounded-xl" style={{ background: "rgba(200,80,80,0.06)", color: "#c04040", border: "1px solid rgba(200,80,80,0.15)" }}>{error}</motion.div>}
              </AnimatePresence>

              <motion.button type="submit" disabled={loading} className="w-full py-4 rounded-xl text-sm tracking-[0.14em] uppercase flex items-center justify-center gap-3" style={{ background: "#5C6B57", color: "#F6F4EF" }} whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }} whileTap={{ scale: 0.98 }}>
                {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader size={16} /></motion.div> : "Send Reset Link"}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
            <motion.div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(92,107,87,0.1)", border: "1px solid rgba(92,107,87,0.3)" }}>
              <Check size={22} style={{ color: "#5C6B57" }} />
            </motion.div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 300, color: "#2C2B29" }}>Check your inbox</h2>
            <p className="mt-3 text-sm" style={{ color: "#4A4845" }}>
              We sent a reset link to <strong style={{ color: "#2C2B29" }}>{email}</strong>
            </p>
            <p className="mt-1 text-xs" style={{ color: "#4A4845" }}>Didn't receive it? Check your spam folder.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 text-center">
        <Link href="/auth/login">
          <motion.span className="text-sm" style={{ color: "#5C6B57" }} whileHover={{ opacity: 0.7 }}>← Back to Sign In</motion.span>
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{ background: "#F6F4EF" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(92,107,87,0.08) 0%, transparent 60%)" }} />

      <Link href="/" className="absolute top-7 left-7 z-10">
        <motion.div
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: "rgba(44,43,41,0.06)", color: "#4A4845" }}
          whileHover={{ background: "rgba(44,43,41,0.1)", color: "#2C2B29" }}
          whileTap={{ scale: 0.94 }}
        >
          <ArrowLeft size={16} />
        </motion.div>
      </Link>

      <Link href="/" className="absolute top-8 left-1/2 -translate-x-1/2">
        <motion.span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", letterSpacing: "0.15em" }} whileHover={{ opacity: 0.6 }}>
          Atmava
        </motion.span>
      </Link>

      <motion.div className="w-full max-w-md relative z-10" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-7 h-7 rounded-full border-2 border-t-transparent" style={{ borderColor: "#5C6B57" }} />
          </div>
        }>
          <ForgotPasswordInner />
        </Suspense>
      </motion.div>
    </div>
  );
}
