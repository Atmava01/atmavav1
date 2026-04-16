"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Tag, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getProgramById, getActiveEnrollment } from "@/lib/firestore";
import type { Program } from "@/types";

interface Props {
  programId: string;
  programTitle: string;
  durationDays: number;
  /** Price in INR (not paise) */
  price: number;
  onClose: () => void;
}

type Step = "checking" | "enrolled" | "select" | "confirm" | "loading" | "processing" | "success" | "error";

const REFERRAL_DISCOUNT = 0.05; // 5%

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as Window & { Razorpay?: unknown }).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentModal({ programId, programTitle, durationDays, price, onClose }: Props) {
  const { user } = useAuth();
  const router   = useRouter();

  const [step, setStep]                     = useState<Step>("checking");
  const [error, setError]                   = useState("");
  const [redirectTo, setRedirectTo]         = useState("/dashboard");
  const [program, setProgram]               = useState<Program | null>(null);
  const [programLoading, setProgramLoading] = useState(true);
  const [selectedLevel, setSelectedLevel]   = useState("");
  const [selectedBatch, setSelectedBatch]   = useState("");
  const [selectError, setSelectError]       = useState("");

  // Referral code state
  const [referralInput, setReferralInput]   = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError]   = useState("");

  const finalPrice = referralApplied
    ? Math.round(price * (1 - REFERRAL_DISCOUNT))
    : price;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Check existing enrollment, then load program
  useEffect(() => {
    (async () => {
      if (user) {
        const existing = await getActiveEnrollment(user.uid).catch(() => null);
        if (existing) { setStep("enrolled"); return; }
      }
      setStep("select");
      getProgramById(programId)
        .then(p => { setProgram(p); setProgramLoading(false); })
        .catch(() => setProgramLoading(false));
    })();
  }, [user, programId]);

  const handleConfirmSelection = () => {
    if (!selectedLevel) { setSelectError("Please select a level to continue."); return; }
    if (!selectedBatch) { setSelectError("Please select a batch to continue."); return; }
    setSelectError("");
    setStep("confirm");
  };

  const handleApplyReferral = () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) { setReferralError("Enter a referral code."); return; }
    if (code.length < 6 || code.length > 10 || !/^[A-Z0-9]+$/.test(code)) {
      setReferralError("Invalid referral code format.");
      return;
    }
    setReferralApplied(true);
    setReferralError("");
  };

  const handleRemoveReferral = () => {
    setReferralApplied(false);
    setReferralInput("");
    setReferralError("");
  };

  const handlePayment = async () => {
    if (!user) {
      router.push(`/auth/signup?program=${programId}&action=buy`);
      return;
    }

    setStep("loading");

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment SDK. Check your connection.");

      const idToken  = await user.getIdToken(true);
      const orderRes = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body:    JSON.stringify({
          programId,
          referralCode: referralApplied ? referralInput.trim().toUpperCase() : undefined,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Order creation failed (${orderRes.status})`);
      }

      const { orderId, keyId, amount, currency } = await orderRes.json();

      setStep("processing");

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key:         keyId,
          order_id:    orderId,
          amount,
          currency,
          name:        "Atmava",
          description: `${programTitle} — ${durationDays} Days`,
          image:       "/favicon.ico",
          prefill: {
            name:  user.displayName ?? "",
            email: user.email       ?? "",
          },
          theme:  { color: "#5C6B57" },
          modal:  { ondismiss: () => { setStep("confirm"); resolve(); } },

          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            try {
              const token     = await user.getIdToken(true);
              const verifyRes = await fetch("/api/payments/verify", {
                method:  "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body:    JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  programId,
                  level: selectedLevel,
                  batch: selectedBatch,
                }),
              });

              if (!verifyRes.ok) {
                const err = await verifyRes.json().catch(() => ({}));
                throw new Error(err.error ?? "Payment verification failed");
              }

              const data = await verifyRes.json();
              setRedirectTo(data.redirectTo ?? "/dashboard");
              setStep("success");
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        });

        rzp.on("payment.failed", (res: { error: { description: string } }) => {
          reject(new Error(res.error?.description ?? "Payment failed"));
        });

        rzp.open();
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const optionStyle = (selected: boolean): React.CSSProperties => ({
    padding: "10px 16px",
    borderRadius: "10px",
    border: `1.5px solid ${selected ? "#7A8C74" : "rgba(255,255,255,0.1)"}`,
    background: selected ? "rgba(92,107,87,0.28)" : "rgba(255,255,255,0.04)",
    color: selected ? "#F6F4EF" : "rgba(246,244,239,0.55)",
    cursor: "pointer",
    fontSize: "13px",
    textAlign: "left" as const,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: selected ? 500 : 400,
    boxShadow: selected ? "inset 0 0 0 1px rgba(122,140,116,0.3), 0 0 12px rgba(92,107,87,0.15)" : "none",
    transition: "all 0.15s ease",
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,25,23,0.85)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onClose(); }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#1E1D1B", border: "1px solid rgba(255,255,255,0.08)" }}
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <AnimatePresence mode="wait">

          {/* ── Checking enrollment ───────────────────────────────────────── */}
          {step === "checking" && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-12 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#7A8C74" }}
              />
            </motion.div>
          )}

          {/* ── Already enrolled ──────────────────────────────────────────── */}
          {step === "enrolled" && (
            <motion.div key="enrolled" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#F6F4EF", fontWeight: 300 }}>
                  Already Enrolled
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-5 rounded-xl mb-6" style={{ background: "rgba(92,107,87,0.1)", border: "1px solid rgba(92,107,87,0.2)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(92,107,87,0.2)" }}>
                    <Check size={14} style={{ color: "#7A8C74" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#F6F4EF" }}>You have an active enrollment</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(246,244,239,0.5)" }}>
                      You are currently enrolled in a program. Students can only be enrolled in one program at a time. Complete or finish your current program before enrolling in a new one.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => { onClose(); router.push("/dashboard"); }}
                  className="flex-1 py-3.5 rounded-xl text-sm tracking-widest uppercase"
                  style={{ background: "#5C6B57", color: "#F6F4EF" }}
                  whileHover={{ background: "#4A5645" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Go to Dashboard
                </motion.button>
                <motion.button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Select Level & Batch ──────────────────────────────────────── */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="flex items-center justify-between mb-7">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>
                  {programTitle}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                >
                  <X size={14} />
                </button>
              </div>

              {programLoading ? (
                <div className="flex justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "#7A8C74" }}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Level */}
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#7A8C74" }}>
                      Select Level <span style={{ color: "rgba(220,60,60,0.8)" }}>*</span>
                    </p>
                    <div className="space-y-2">
                      {(program?.levels ?? []).map(level => (
                        <button
                          key={level}
                          style={optionStyle(selectedLevel === level)}
                          onClick={() => { setSelectedLevel(level); setSelectError(""); }}
                        >
                          <span>{level}</span>
                          {selectedLevel === level && (
                            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#5C6B57", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#F6F4EF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch */}
                  <div>
                    <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#7A8C74" }}>
                      Select Batch <span style={{ color: "rgba(220,60,60,0.8)" }}>*</span>
                    </p>
                    <div className="space-y-2">
                      {(program?.batches ?? []).map(batch => (
                        <button
                          key={batch.name}
                          style={optionStyle(selectedBatch === batch.name)}
                          onClick={() => { setSelectedBatch(batch.name); setSelectError(""); }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{batch.name}</span>
                            {batch.time && (
                              <span style={{ color: "rgba(246,244,239,0.4)", fontSize: "12px" }}>{batch.time}</span>
                            )}
                          </span>
                          {selectedBatch === batch.name && (
                            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#5C6B57", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#F6F4EF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs" style={{ color: "rgba(220,100,100,0.9)" }}>
                        {selectError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={handleConfirmSelection}
                    className="w-full py-4 rounded-xl text-sm tracking-widest uppercase"
                    style={{ background: "#5C6B57", color: "#F6F4EF" }}
                    whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue →
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Confirm + Referral ────────────────────────────────────────── */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="flex items-center justify-between mb-7">
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>
                  {programTitle}
                </h2>
                <button
                  onClick={() => setStep("select")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                >
                  ←
                </button>
              </div>

              {/* Summary table */}
              <div className="rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { label: "Program",  val: `${durationDays}-Day Journey` },
                  { label: "Level",    val: selectedLevel },
                  { label: "Batch",    val: selectedBatch },
                  { label: "Currency", val: "INR (Indian Rupee)" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between px-5 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>{r.label}</span>
                    <span className="text-sm" style={{ color: "#F6F4EF" }}>{r.val}</span>
                  </div>
                ))}

                {/* Total row — changes when referral applied */}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>Total</span>
                  <div className="flex items-center gap-2">
                    {referralApplied && (
                      <span className="text-sm line-through" style={{ color: "rgba(246,244,239,0.3)" }}>
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className="text-sm font-medium" style={{ color: referralApplied ? "#7A8C74" : "#F6F4EF" }}>
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referral code */}
              <div className="mb-5">
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "rgba(246,244,239,0.4)" }}>
                  Referral Code
                </p>

                <AnimatePresence mode="wait">
                  {referralApplied ? (
                    <motion.div
                      key="applied"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: "rgba(92,107,87,0.15)", border: "1px solid rgba(92,107,87,0.3)" }}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={13} style={{ color: "#7A8C74" }} />
                        <span className="text-sm font-semibold tracking-wider" style={{ color: "#7A8C74" }}>
                          {referralInput.trim().toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.25)", color: "#7A8C74" }}>
                          5% off applied
                        </span>
                      </div>
                      <button onClick={handleRemoveReferral} style={{ color: "rgba(246,244,239,0.35)" }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={referralInput}
                          onChange={e => { setReferralInput(e.target.value); setReferralError(""); }}
                          placeholder="Enter code (optional)"
                          maxLength={10}
                          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${referralError ? "rgba(220,100,100,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: "#F6F4EF",
                          }}
                          onKeyDown={e => { if (e.key === "Enter") handleApplyReferral(); }}
                        />
                        <motion.button
                          onClick={handleApplyReferral}
                          className="px-4 py-2.5 rounded-xl text-sm"
                          style={{ background: "rgba(92,107,87,0.2)", color: "#7A8C74", border: "1px solid rgba(92,107,87,0.25)" }}
                          whileHover={{ background: "rgba(92,107,87,0.3)" }}
                          whileTap={{ scale: 0.96 }}
                        >
                          Apply
                        </motion.button>
                      </div>
                      <AnimatePresence>
                        {referralError && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-xs mt-1.5" style={{ color: "rgba(220,100,100,0.9)" }}>
                            {referralError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="text-xs mb-5" style={{ color: "rgba(246,244,239,0.35)", lineHeight: 1.7 }}>
                You will be redirected to a secure Razorpay checkout. Supports UPI, cards, net banking, and wallets.
              </p>

              <motion.button
                onClick={handlePayment}
                className="w-full py-4 rounded-xl text-sm tracking-widest uppercase"
                style={{ background: "#5C6B57", color: "#F6F4EF" }}
                whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }}
                whileTap={{ scale: 0.98 }}
              >
                Pay ₹{finalPrice.toLocaleString("en-IN")} →
              </motion.button>

              <p className="text-center text-xs mt-4" style={{ color: "rgba(246,244,239,0.25)" }}>
                Secured by Razorpay · 256-bit SSL encryption
              </p>
            </motion.div>
          )}

          {/* ── Loading / Processing ──────────────────────────────────────── */}
          {(step === "loading" || step === "processing") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-12 flex flex-col items-center justify-center gap-5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#7A8C74" }}
              />
              <p className="text-sm" style={{ color: "rgba(246,244,239,0.6)" }}>
                {step === "loading" ? "Preparing payment…" : "Processing your payment…"}
              </p>
            </motion.div>
          )}

          {/* ── Success ──────────────────────────────────────────────────── */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="p-10 flex flex-col items-center text-center gap-5">
              <motion.div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(122,140,116,0.15)", border: "1px solid rgba(122,140,116,0.3)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <Check size={28} style={{ color: "#7A8C74" }} />
              </motion.div>

              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#F6F4EF", fontWeight: 300 }}>
                  Payment Confirmed
                </h3>
                <p className="text-sm mt-2" style={{ color: "rgba(246,244,239,0.5)" }}>
                  Welcome to {programTitle}
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.35)" }}>
                  Your enrollment is now active. Head to your dashboard to get started.
                </p>
              </div>

              <motion.button
                onClick={() => { window.location.href = redirectTo; }}
                className="mt-2 w-full py-4 rounded-xl text-sm tracking-widests uppercase"
                style={{ background: "#5C6B57", color: "#F6F4EF" }}
                whileHover={{ background: "#4A5645" }}
                whileTap={{ scale: 0.98 }}
              >
                Go to Dashboard →
              </motion.button>
            </motion.div>
          )}

          {/* ── Error ────────────────────────────────────────────────────── */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#F6F4EF", fontWeight: 300 }}>
                  Payment Failed
                </h3>
                <button onClick={onClose} style={{ color: "rgba(246,244,239,0.4)" }}><X size={14} /></button>
              </div>
              <div className="p-4 rounded-xl mb-6" style={{ background: "rgba(192,64,64,0.08)", border: "1px solid rgba(192,64,64,0.2)" }}>
                <p className="text-sm" style={{ color: "#c04040" }}>{error}</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => { setStep("confirm"); setError(""); }}
                  className="flex-1 py-3.5 rounded-xl text-sm tracking-widests uppercase"
                  style={{ background: "#5C6B57", color: "#F6F4EF" }}
                  whileHover={{ background: "#4A5645" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Try Again
                </motion.button>
                <motion.button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
