"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, KeyRound, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LOCKOUT_MS   = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3;

function getLockoutKey(uid: string) {
  return `atmava_fp_${uid}`;
}

interface LockoutData {
  attempts: number;
  lockedUntil: number | null;
}

function loadLockout(uid: string): LockoutData {
  try {
    const raw = localStorage.getItem(getLockoutKey(uid));
    if (raw) return JSON.parse(raw) as LockoutData;
  } catch { /* ignore */ }
  return { attempts: 0, lockedUntil: null };
}

function saveLockout(uid: string, data: LockoutData) {
  localStorage.setItem(getLockoutKey(uid), JSON.stringify(data));
}

function clearLockout(uid: string) {
  localStorage.removeItem(getLockoutKey(uid));
}

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  background: "#EFEDE7",
  border: "1px solid #D4CCBF",
  color: "#2C2B29",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5C6B57",
  marginBottom: "7px",
  fontWeight: 500,
};

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputBase, paddingRight: "44px" }}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: "#4A4845",
          display: "flex", alignItems: "center",
        }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function StatusMessage({ type, children }: { type: "error" | "success" | "warning"; children: React.ReactNode }) {
  const colors = {
    error:   { bg: "rgba(192,64,64,0.07)",  border: "rgba(192,64,64,0.25)",  text: "#b03030" },
    success: { bg: "rgba(92,107,87,0.08)",  border: "rgba(92,107,87,0.3)",   text: "#3d5438" },
    warning: { bg: "rgba(180,120,30,0.08)", border: "rgba(180,120,30,0.25)", text: "#7a5010" },
  }[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: "11px 14px", borderRadius: "10px",
        background: colors.bg, border: `1px solid ${colors.border}`,
        color: colors.text, fontSize: "13px", lineHeight: 1.5,
      }}
    >
      {children}
    </motion.div>
  );
}

export default function ChangePasswordPage() {
  const { user, changePassword, resetPassword } = useAuth();
  const router = useRouter();
  const isEmailUser = user?.providerData.some(p => p.providerId === "password") ?? false;

  // ── Change password state ────────────────────────────────────────
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [cpStatus, setCpStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [cpLoading, setCpLoading] = useState(false);

  // ── Forgot password state ────────────────────────────────────────
  const [fpEmail, setFpEmail]     = useState("");
  const [fpStatus, setFpStatus]   = useState<{ type: "error" | "success" | "warning"; msg: string } | null>(null);
  const [fpLoading, setFpLoading] = useState(false);
  const [lockout, setLockout]     = useState<LockoutData>({ attempts: 0, lockedUntil: null });
  const [timeLeft, setTimeLeft]   = useState(0);

  // Load lockout on mount
  useEffect(() => {
    if (!user) return;
    const data = loadLockout(user.uid);
    // If lockout expired, reset
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      clearLockout(user.uid);
      setLockout({ attempts: 0, lockedUntil: null });
    } else {
      setLockout(data);
    }
  }, [user]);

  // Countdown timer while locked
  useEffect(() => {
    if (!lockout.lockedUntil) return;
    const tick = () => {
      const remaining = lockout.lockedUntil! - Date.now();
      if (remaining <= 0) {
        if (user) clearLockout(user.uid);
        setLockout({ attempts: 0, lockedUntil: null });
        setFpStatus(null);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockout.lockedUntil, user]);

  const fmtTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, "0")}s`;
  };

  // ── Handlers ─────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    setCpStatus(null);
    if (!next || !current) {
      setCpStatus({ type: "error", msg: "Please fill in all fields." });
      return;
    }
    if (next.length < 8) {
      setCpStatus({ type: "error", msg: "New password must be at least 8 characters." });
      return;
    }
    if (next !== confirm) {
      setCpStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }
    setCpLoading(true);
    try {
      await changePassword(current, next);
      setCpStatus({ type: "success", msg: "Password updated successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setCpStatus({ type: "error", msg: "Current password is incorrect." });
      } else if (code === "auth/weak-password") {
        setCpStatus({ type: "error", msg: "New password is too weak. Use at least 8 characters." });
      } else {
        setCpStatus({ type: "error", msg: "Something went wrong. Please try again." });
      }
    } finally {
      setCpLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setFpStatus(null);
    if (!user) return;

    // Check lockout
    if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
      setFpStatus({ type: "warning", msg: `Too many attempts. Try again in ${fmtTime(timeLeft)}.` });
      return;
    }

    if (!fpEmail.trim()) {
      setFpStatus({ type: "error", msg: "Please enter your email address." });
      return;
    }

    // Email must match the signed-in user's email
    if (fpEmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      const newAttempts = lockout.attempts + 1;
      const remaining   = MAX_ATTEMPTS - newAttempts;

      if (newAttempts >= MAX_ATTEMPTS) {
        const locked: LockoutData = { attempts: newAttempts, lockedUntil: Date.now() + LOCKOUT_MS };
        saveLockout(user.uid, locked);
        setLockout(locked);
        setFpStatus({ type: "warning", msg: "Too many failed attempts. This action is locked for 1 hour." });
      } else {
        const updated: LockoutData = { attempts: newAttempts, lockedUntil: null };
        saveLockout(user.uid, updated);
        setLockout(updated);
        setFpStatus({
          type: "error",
          msg: `Email does not match your account. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        });
      }
      return;
    }

    // Email matches — send the link
    setFpLoading(true);
    try {
      await resetPassword(fpEmail.trim());
      clearLockout(user.uid);
      setLockout({ attempts: 0, lockedUntil: null });
      setFpEmail("");
      setFpStatus({ type: "success", msg: "Reset link sent. Check your inbox." });
    } catch {
      setFpStatus({ type: "error", msg: "Failed to send reset email. Please try again." });
    } finally {
      setFpLoading(false);
    }
  };

  const isLocked = lockout.lockedUntil !== null && Date.now() < lockout.lockedUntil;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back + header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm mb-6"
          style={{ color: "#5C6B57", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={14} />
          Back to Settings
        </button>

        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.7rem, 5vw, 2.3rem)",
            fontWeight: 300,
            color: "#2C2B29",
            marginBottom: "4px",
          }}
        >
          Password &amp; Security
        </h2>
        <p className="text-sm" style={{ color: "#4A4845" }}>
          Manage your login credentials
        </p>
      </motion.div>

      {/* ── Change Password ─────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-7 md:p-8"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.07 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(92,107,87,0.1)" }}
          >
            <KeyRound size={15} style={{ color: "#5C6B57" }} />
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>Security</p>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.35rem",
                fontWeight: 400,
                color: "#2C2B29",
              }}
            >
              Change Password
            </h3>
          </div>
        </div>

        {!isEmailUser ? (
          <p className="text-sm mt-4" style={{ color: "#4A4845" }}>
            You signed in with Google or Apple. Password change is not available for social logins.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label style={labelStyle}>Current Password</label>
              <PasswordInput value={current} onChange={setCurrent} placeholder="Enter current password" />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <PasswordInput value={next} onChange={setNext} placeholder="At least 8 characters" />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter new password" />
            </div>

            <AnimatePresence mode="wait">
              {cpStatus && (
                <StatusMessage key={cpStatus.msg} type={cpStatus.type}>
                  {cpStatus.msg}
                </StatusMessage>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleChangePassword}
              disabled={cpLoading}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm tracking-widest uppercase"
              style={{
                background: "#5C6B57",
                color: "#F6F4EF",
                border: "none",
                cursor: cpLoading ? "not-allowed" : "pointer",
                opacity: cpLoading ? 0.7 : 1,
                fontFamily: "inherit",
                letterSpacing: "0.1em",
              }}
              whileHover={!cpLoading ? { background: "#4A5948" } : {}}
              whileTap={!cpLoading ? { scale: 0.97 } : {}}
            >
              <ShieldCheck size={14} />
              {cpLoading ? "Updating…" : "Update Password"}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ── Forgot Password ─────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-7 md:p-8"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.14 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(92,107,87,0.1)" }}
          >
            <Lock size={15} style={{ color: "#5C6B57" }} />
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#5C6B57" }}>Recovery</p>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.35rem",
                fontWeight: 400,
                color: "#2C2B29",
              }}
            >
              Forgot Password
            </h3>
          </div>
        </div>
        <p className="text-sm mt-2 mb-5" style={{ color: "#4A4845" }}>
          Enter the email address associated with your account and we&apos;ll send you a reset link.
        </p>

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={fpEmail}
              onChange={e => setFpEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !isLocked) handleForgotPassword(); }}
              placeholder="your@email.com"
              disabled={isLocked}
              style={{ ...inputBase, opacity: isLocked ? 0.5 : 1 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {fpStatus && (
              <StatusMessage key={fpStatus.msg} type={fpStatus.type}>
                {fpStatus.msg}
                {isLocked && timeLeft > 0 && (
                  <span style={{ display: "block", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                    Unlocks in {fmtTime(timeLeft)}
                  </span>
                )}
              </StatusMessage>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleForgotPassword}
            disabled={fpLoading || isLocked}
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm tracking-widest uppercase"
            style={{
              border: "1px solid #D4CCBF",
              color: "#2C2B29",
              background: "#F6F4EF",
              cursor: fpLoading || isLocked ? "not-allowed" : "pointer",
              opacity: fpLoading || isLocked ? 0.5 : 1,
              fontFamily: "inherit",
              letterSpacing: "0.1em",
            }}
            whileHover={!fpLoading && !isLocked ? { borderColor: "#5C6B57", background: "#E8E1D6" } : {}}
            whileTap={!fpLoading && !isLocked ? { scale: 0.97 } : {}}
          >
            {fpLoading ? "Sending…" : "Send Reset Link"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
