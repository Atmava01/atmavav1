"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, resendVerificationEmail, refreshUser, signOut } = useAuth();

  const [checking, setChecking]     = useState(false);
  const [checkError, setCheckError] = useState("");
  const [resending, setResending]   = useState(false);
  const [resentDone, setResentDone] = useState(false);
  const [resendError, setResendError] = useState("");

  // Auto-redirect if already verified or not logged in
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth/login"); return; }
    if (user.emailVerified) { router.replace("/dashboard"); return; }
  }, [user, loading, router]);

  // "I've verified — Continue" handler
  const handleCheckVerified = async () => {
    setChecking(true);
    setCheckError("");
    try {
      await refreshUser();
      // After refreshUser, auth.currentUser has the latest state
      if (auth.currentUser?.emailVerified) {
        router.replace("/dashboard");
      } else {
        setCheckError("Not verified yet. Please click the link in your email, then try again.");
      }
    } catch {
      setCheckError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // Resend handler
  const handleResend = async () => {
    setResending(true);
    setResentDone(false);
    setResendError("");
    try {
      await resendVerificationEmail();
      setResentDone(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setResendError(
        code === "auth/too-many-requests"
          ? "Please wait a few minutes before requesting another email."
          : "Failed to send. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F4EF" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-7 h-7 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5C6B57" }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "#F6F4EF" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(92,107,87,0.08) 0%, transparent 60%)" }}
      />

      {/* Home arrow */}
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

      {/* Logo */}
      <Link href="/" className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <motion.span
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#2C2B29", letterSpacing: "0.15em" }}
          whileHover={{ opacity: 0.6 }}
        >
          Atmava
        </motion.span>
      </Link>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div
          className="p-8 md:p-10 rounded-2xl text-center"
          style={{
            background: "rgba(246,244,239,0.85)",
            border: "1px solid #D4CCBF",
            backdropFilter: "blur(20px)",
            boxShadow: "0 24px 60px rgba(44,43,41,0.07)",
          }}
        >
          {/* Icon */}
          <motion.div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-7"
            style={{ background: "rgba(92,107,87,0.1)", border: "1px solid rgba(92,107,87,0.25)" }}
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                "0 0 0 0 rgba(92,107,87,0.15)",
                "0 0 20px 8px rgba(92,107,87,0.06)",
                "0 0 0 0 rgba(92,107,87,0.15)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Mail size={28} style={{ color: "#5C6B57" }} />
          </motion.div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem",
              fontWeight: 300,
              color: "#2C2B29",
              marginBottom: "12px",
            }}
          >
            Verify your email
          </h1>

          {/* Body text */}
          <p className="text-sm mb-1" style={{ color: "#4A4845", lineHeight: 1.7 }}>
            We sent a verification link to
          </p>
          <p className="text-sm font-medium mb-2" style={{ color: "#2C2B29" }}>
            {user.email}
          </p>
          <p className="text-xs mb-8" style={{ color: "#4A4845" }}>
            Click the link in that email, then come back here.
          </p>

          {/* Primary: I've verified */}
          <motion.button
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full py-4 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center gap-3 mb-4"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
            whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }}
            whileTap={{ scale: 0.98 }}
          >
            {checking
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader size={16} /></motion.div>
              : "I've verified — Continue →"}
          </motion.button>

          {/* Check error */}
          <AnimatePresence>
            {checkError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm px-4 py-3 rounded-xl mb-4 overflow-hidden text-left"
                style={{ background: "rgba(200,80,80,0.06)", color: "#c04040", border: "1px solid rgba(200,80,80,0.15)" }}
              >
                {checkError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "#D4CCBF" }} />
            <span className="text-xs tracking-widest uppercase" style={{ color: "#4A4845" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "#D4CCBF" }} />
          </div>

          {/* Secondary: Resend */}
          <motion.button
            onClick={handleResend}
            disabled={resending || resentDone}
            className="w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-3"
            style={{
              border: "1px solid #D4CCBF",
              background: resentDone ? "rgba(92,107,87,0.06)" : "#F6F4EF",
              color: resentDone ? "#5C6B57" : "#2C2B29",
            }}
            whileHover={{ borderColor: "#5C6B57", background: "#E8E1D6" }}
            whileTap={{ scale: 0.98 }}
          >
            {resending
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader size={14} /></motion.div> Sending…</>
              : resentDone
              ? "Email sent ✓"
              : "Resend verification email"}
          </motion.button>

          {/* Resend error */}
          <AnimatePresence>
            {resendError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs mb-3"
                style={{ color: "#c04040" }}
              >
                {resendError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Sign out link */}
          <button
            onClick={handleSignOut}
            className="text-xs mt-2"
            style={{ color: "#4A4845" }}
          >
            <motion.span whileHover={{ color: "#5C6B57" }}>
              Sign out and use a different account ↗
            </motion.span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
