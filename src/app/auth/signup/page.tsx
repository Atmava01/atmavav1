"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Inner component (reads searchParams — must be inside Suspense) ───────────
function SignupInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, signUpWithEmail, signInWithGoogle, signInWithApple, resendVerificationEmail, loading: authLoading } = useAuth();

  // URL params set when arriving from "Buy Now" on the programs page
  const programParam = searchParams.get("program") ?? "";   // e.g. "30" | "60" | "90"
  const actionParam  = searchParams.get("action")  ?? "";   // "buy" | ""
  const isBuyFlow    = actionParam === "buy" && !!programParam;

  const [step, setStep]         = useState(1);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Resend state (used in step-2 check-inbox screen)
  const [resentEmail, setResentEmail]           = useState(false);
  const [resendingEmail, setResendingEmail]     = useState(false);
  const [resendSignupError, setResendSignupError] = useState("");

  // Already logged in → skip signup and route appropriately
  // But stay on page (step 2) if we just completed an email signup and are waiting for verification
  useEffect(() => {
    if (!authLoading && user && step !== 2) {
      const isEmailProvider = user.providerData.some(p => p.providerId === "password");
      if (isEmailProvider && !user.emailVerified) {
        // Unverified email user landed here while already signed in — send to verify page
        router.replace("/auth/verify-email");
        return;
      }
      router.replace(isBuyFlow ? `/programs?buy=${programParam}` : "/dashboard");
    }
  }, [user, authLoading, isBuyFlow, programParam, router, step]);

  // Called after every successful auth
  const afterAuth = (isEmailSignup = false) => {
    if (isEmailSignup) {
      // Show check-inbox screen regardless of buy flow (must verify before purchasing)
      setStep(2);
      return;
    }
    // Google / Apple → already verified, proceed normally
    router.replace(isBuyFlow ? `/programs?buy=${programParam}` : "/dashboard");
  };

  const handleResendFromSignup = async () => {
    setResendingEmail(true);
    setResentEmail(false);
    setResendSignupError("");
    try {
      await resendVerificationEmail();
      setResentEmail(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setResendSignupError(
        code === "auth/too-many-requests"
          ? "Please wait a few minutes before requesting another email."
          : "Failed to send. Please try again."
      );
    } finally {
      setResendingEmail(false);
    }
  };

  const formatError = (code: string) => {
    const map: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password":         "Password must be at least 6 characters.",
      "auth/invalid-email":         "Please enter a valid email address.",
    };
    return map[code] ?? "Sign up failed. Please try again.";
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6)           { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      afterAuth(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(formatError(code));
    } finally { setLoading(false); }
  };

  const formatOAuthError = (code: string) => {
    const map: Record<string, string> = {
      "auth/popup-closed-by-user":    "Sign-in cancelled.",
      "auth/cancelled-popup-request": "Sign-in cancelled.",
      "auth/popup-blocked":           "Pop-up blocked. Please allow pop-ups for this site and try again.",
      "auth/unauthorized-domain":     "This domain isn't authorised. Add it in Firebase Console → Authentication → Authorized domains.",
      "auth/operation-not-allowed":   "This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
      "auth/network-request-failed":  "Network error. Check your connection.",
      "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
    };
    return map[code] ?? `Sign-in failed (${code || "unknown"}). Please try again.`;
  };

  const handleGoogleSignup = async () => {
    setError(""); setLoading(true);
    try { await signInWithGoogle(); afterAuth(); }
    catch (err: unknown) { setError(formatOAuthError((err as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  };

  const handleAppleSignup = async () => {
    setError(""); setLoading(true);
    try { await signInWithApple(); afterAuth(); }
    catch (err: unknown) { setError(formatOAuthError((err as { code?: string }).code ?? "")); }
    finally { setLoading(false); }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    background: "#F6F4EF",
    border: `1px solid ${focusedField === field ? "#5C6B57" : "#D4CCBF"}`,
    color: "#2C2B29",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(92,107,87,0.1)" : "none",
  });

  // Show loader while auth state is resolving or redirect is in-flight (prevents form flash)
  if (authLoading || (user && step !== 2)) {
    return (
      <div className="flex justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-7 h-7 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5C6B57" }}
        />
      </div>
    );
  }

  // ── Step 2: check-inbox screen ───────────────────────────────────────────
  if (step === 2) {
    return (
      <motion.div
        key="inbox"
        className="p-8 md:p-10 rounded-2xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "rgba(246,244,239,0.85)",
          border: "1px solid #D4CCBF",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 60px rgba(44,43,41,0.07)",
        }}
      >
        {/* Animated mail icon */}
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

        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, color: "#2C2B29", marginBottom: "12px" }}>
          Check your inbox
        </h2>
        <p className="text-sm mb-1" style={{ color: "#4A4845", lineHeight: 1.7 }}>
          We sent a verification link to
        </p>
        <p className="text-sm font-medium mb-2" style={{ color: "#2C2B29" }}>
          {email}
        </p>
        <p className="text-xs mb-8" style={{ color: "#4A4845" }}>
          Click the link in that email to activate your account.
        </p>

        {/* Resend button */}
        <motion.button
          onClick={handleResendFromSignup}
          disabled={resendingEmail || resentEmail}
          className="w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-3"
          style={{
            border: "1px solid #D4CCBF",
            background: resentEmail ? "rgba(92,107,87,0.06)" : "#F6F4EF",
            color: resentEmail ? "#5C6B57" : "#2C2B29",
          }}
          whileHover={{ borderColor: "#5C6B57", background: "#E8E1D6" }}
          whileTap={{ scale: 0.98 }}
        >
          {resendingEmail
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader size={14} /></motion.div> Sending…</>
            : resentEmail
            ? "Email sent ✓"
            : "Resend verification email"}
        </motion.button>

        <AnimatePresence>
          {resendSignupError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs mb-4"
              style={{ color: "#c04040" }}
            >
              {resendSignupError}
            </motion.p>
          )}
        </AnimatePresence>

        <Link href="/auth/login">
          <motion.span className="text-xs" style={{ color: "#4A4845" }} whileHover={{ color: "#5C6B57" }}>
            Back to sign in ↗
          </motion.span>
        </Link>
      </motion.div>
    );
  }

  // ── Step 1: create account ────────────────────────────────────────────────
  return (
    <motion.div
      key="s1"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <div
        className="p-8 md:p-10 rounded-2xl"
        style={{
          background: "rgba(246,244,239,0.85)",
          border: "1px solid #D4CCBF",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 60px rgba(44,43,41,0.07)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", fontWeight: 300, color: "#2C2B29" }}>
            {isBuyFlow ? "Create your account" : "Begin your journey"}
          </h1>
          <p className="text-sm mt-2" style={{ color: "#4A4845" }}>
            {isBuyFlow ? "Sign up to complete your purchase" : "Create your sacred space"}
          </p>
        </div>

        {/* Social sign-in */}
        <div className="space-y-3 mb-7">
          <motion.button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-3"
            style={{ border: "1px solid #D4CCBF", background: "#F6F4EF", color: "#2C2B29" }}
            whileHover={{ borderColor: "#5C6B57", background: "#E8E1D6" }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.1-.84 2.03-1.8 2.66v2.21h2.92c1.71-1.57 2.68-3.89 2.68-6.51z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.35C2.44 15.98 5.48 18 9 18z" fill="#34A853"/>
              <path d="M3.97 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.95H.96A9.01 9.01 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.35z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.47.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.35C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>

          <motion.button
            onClick={handleAppleSignup}
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-3"
            style={{ border: "1px solid #D4CCBF", background: "#F6F4EF", color: "#2C2B29" }}
            whileHover={{ borderColor: "#5C6B57", background: "#E8E1D6" }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="17" height="17" viewBox="0 0 814 1000" fill="#2C2B29">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 481.8 6.6 327.8 6.6 180.5c0-198.8 130.3-304.1 256.9-304.1 68 0 124.4 44.8 167.4 44.8 41.8 0 107.2-47.1 183.7-47.1 28 0 130.3 2.6 198.5 99.6z"/>
            </svg>
            Continue with Apple
          </motion.button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex-1 h-px" style={{ background: "#D4CCBF" }} />
          <span className="text-xs tracking-widest uppercase" style={{ color: "#4A4845" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#D4CCBF" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSignup} className="space-y-5">
          {[
            { id: "name",  label: "Full Name", type: "text",  val: name,  set: setName,  ph: "Your name" },
            { id: "email", label: "Email",     type: "email", val: email, set: setEmail, ph: "you@example.com" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#4A4845" }}>{f.label}</label>
              <input
                type={f.type}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                onFocus={() => setFocusedField(f.id)}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-300"
                style={inputStyle(f.id)}
                placeholder={f.ph}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#4A4845" }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm outline-none transition-all duration-300"
                style={inputStyle("password")}
                placeholder="Min. 6 characters"
              />
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2" onClick={() => setShowPass(!showPass)}>
                {showPass
                  ? <EyeOff size={15} style={{ color: "#4A4845" }} />
                  : <Eye    size={15} style={{ color: "#4A4845" }} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm px-4 py-3 rounded-xl overflow-hidden"
                style={{ background: "rgba(200,80,80,0.06)", color: "#c04040", border: "1px solid rgba(200,80,80,0.15)" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl text-sm tracking-[0.14em] uppercase flex items-center justify-center gap-3 mt-2"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
            whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }}
            whileTap={{ scale: 0.98 }}
          >
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader size={16} /></motion.div>
              : isBuyFlow ? "Create Account & Pay" : "Continue"}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: "#4A4845" }}>
            Already a practitioner?{" "}
            <Link href={isBuyFlow ? `/auth/login?program=${programParam}&action=buy` : "/auth/login"}>
              <motion.span className="underline" style={{ color: "#5C6B57" }} whileHover={{ opacity: 0.7 }}>
                Sign in
              </motion.span>
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page shell with Suspense (required for useSearchParams in Next.js) ────────
export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{ background: "#F6F4EF" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(92,107,87,0.08) 0%, transparent 60%)" }} />

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

      <div className="w-full max-w-md relative z-10 mt-16 mb-10">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-7 h-7 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#5C6B57" }}
              />
            </div>
          }
        >
          <SignupInner />
        </Suspense>
      </div>
    </div>
  );
}
