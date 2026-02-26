"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getProgramById } from "@/lib/firestore";
import type { Program } from "@/types";

interface Props {
  programId: string;
  programTitle: string;
  durationDays: number;
  /** Price in INR */
  price: number;
  onClose: () => void;
}

type Step = "select" | "confirm" | "loading" | "processing" | "success" | "error";

/** Loads the Razorpay checkout.js script exactly once. */
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

  const [step, setStep]             = useState<Step>("select");
  const [error, setError]           = useState("");
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  const [programData, setProgramData]       = useState<Program | null>(null);
  const [programLoading, setProgramLoading] = useState(true);
  const [selectedLevel, setSelectedLevel]   = useState("");
  const [selectedBatch, setSelectedBatch]   = useState("");

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch program batches/levels from Firestore
  useEffect(() => {
    getProgramById(programId)
      .then(p => {
        setProgramData(p);
        // Skip select step if program has no batches/levels
        if (!p || (p.levels.length === 0 && p.batches.length === 0)) {
          setStep("confirm");
        }
        setProgramLoading(false);
      })
      .catch(() => {
        setProgramLoading(false);
        setStep("confirm");
      });
  }, [programId]);

  const hasLevels  = (programData?.levels?.length ?? 0) > 0;
  const hasBatches = (programData?.batches?.length ?? 0) > 0;
  const canProceed = (!hasLevels || !!selectedLevel) && (!hasBatches || !!selectedBatch);

  const handlePayment = async () => {
    if (!user) {
      router.push(`/auth/signup?program=${programId}&action=buy`);
      return;
    }

    setStep("loading");

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment SDK. Check your connection.");

      // 2. Create order on backend
      const idToken  = await user.getIdToken(true);
      const orderRes = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body:    JSON.stringify({ programId }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Order creation failed (${orderRes.status})`);
      }

      const { orderId, keyId, amount, currency } = await orderRes.json();

      // 3. Open Razorpay checkout
      setStep("processing");

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key:       keyId,
          order_id:  orderId,
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
              // 4. Verify payment on backend
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

  const handleSuccessContinue = () => {
    window.location.href = redirectTo;
  };

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

          {/* ── Select step — Level & Batch ───────────────────────────────── */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <div>
                  <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Enroll in</p>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>
                    {programTitle}
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}>✕</button>
              </div>

              {programLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "#7A8C74" }}
                  />
                </div>
              ) : (
                <div className="space-y-6 mb-8">
                  {/* Level selection */}
                  {hasLevels && (
                    <div>
                      <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "rgba(246,244,239,0.5)" }}>Your Level</p>
                      <div className="space-y-2">
                        {programData!.levels.map(l => (
                          <motion.button
                            key={l}
                            onClick={() => setSelectedLevel(l)}
                            className="w-full p-4 rounded-xl text-left"
                            style={{
                              background: selectedLevel === l ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${selectedLevel === l ? "rgba(122,140,116,0.5)" : "rgba(255,255,255,0.08)"}`,
                            }}
                            whileHover={{ background: "rgba(255,255,255,0.07)" }}
                          >
                            <span className="text-sm" style={{ color: "#F6F4EF" }}>{l}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batch selection */}
                  {hasBatches && (
                    <div>
                      <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "rgba(246,244,239,0.5)" }}>Select Batch</p>
                      <div className="space-y-2">
                        {programData!.batches.map(b => (
                          <motion.button
                            key={b.name}
                            onClick={() => setSelectedBatch(b.name)}
                            className="w-full p-4 rounded-xl text-left"
                            style={{
                              background: selectedBatch === b.name ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${selectedBatch === b.name ? "rgba(122,140,116,0.5)" : "rgba(255,255,255,0.08)"}`,
                            }}
                            whileHover={{ background: "rgba(255,255,255,0.07)" }}
                          >
                            <p className="text-sm" style={{ color: "#F6F4EF" }}>{b.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.4)" }}>{b.time}</p>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <motion.button
                onClick={() => setStep("confirm")}
                disabled={programLoading || !canProceed}
                className="w-full py-4 rounded-xl text-sm tracking-widest uppercase"
                style={{
                  background: !programLoading && canProceed ? "#5C6B57" : "rgba(255,255,255,0.06)",
                  color:      !programLoading && canProceed ? "#F6F4EF" : "rgba(246,244,239,0.3)",
                }}
                whileHover={canProceed && !programLoading ? { background: "#4A5645" } : {}}
                whileTap={canProceed && !programLoading ? { scale: 0.98 } : {}}
              >
                Continue →
              </motion.button>
            </motion.div>
          )}

          {/* ── Confirm step ────────────────────────────────────────────── */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-7">
                <div>
                  <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "rgba(246,244,239,0.4)" }}>Enroll in</p>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>
                    {programTitle}
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}>✕</button>
              </div>

              {/* Summary */}
              <div className="p-5 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { label: "Program",  val: `${durationDays} Day Journey` },
                  ...(selectedLevel ? [{ label: "Level",    val: selectedLevel, highlight: false }] : []),
                  ...(selectedBatch ? [{ label: "Batch",    val: selectedBatch, highlight: false }] : []),
                  { label: "Duration", val: `${durationDays} Days access` },
                  { label: "Currency", val: "INR (Indian Rupee)" },
                  { label: "Total",    val: `₹${price.toLocaleString("en-IN")}`, highlight: true },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>{r.label}</span>
                    <span className="text-sm" style={{ color: r.highlight ? "#7A8C74" : "#F6F4EF", fontWeight: r.highlight ? 500 : 400 }}>{r.val}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs mb-6" style={{ color: "rgba(246,244,239,0.35)", lineHeight: 1.7 }}>
                You will be redirected to a secure Razorpay checkout. Supports UPI, cards, net banking, and wallets.
              </p>

              <motion.button
                onClick={handlePayment}
                className="w-full py-4 rounded-xl text-sm tracking-widest uppercase"
                style={{ background: "#5C6B57", color: "#F6F4EF" }}
                whileHover={{ background: "#4A5645", boxShadow: "0 8px 24px rgba(92,107,87,0.25)" }}
                whileTap={{ scale: 0.98 }}
              >
                Pay ₹{price.toLocaleString("en-IN")} →
              </motion.button>

              <p className="text-center text-xs mt-4" style={{ color: "rgba(246,244,239,0.25)" }}>
                Secured by Razorpay · 256-bit SSL encryption
              </p>
            </motion.div>
          )}

          {/* ── Loading / Processing steps ────────────────────────────────── */}
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

          {/* ── Success step ─────────────────────────────────────────────── */}
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
                <motion.span
                  style={{ fontSize: "28px", color: "#7A8C74" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  ✓
                </motion.span>
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
                onClick={handleSuccessContinue}
                className="mt-2 w-full py-4 rounded-xl text-sm tracking-widest uppercase"
                style={{ background: "#5C6B57", color: "#F6F4EF" }}
                whileHover={{ background: "#4A5645" }}
                whileTap={{ scale: 0.98 }}
              >
                Go to Dashboard →
              </motion.button>
            </motion.div>
          )}

          {/* ── Error step ───────────────────────────────────────────────── */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: "#F6F4EF", fontWeight: 300 }}>Payment Failed</h3>
                <button onClick={onClose} style={{ color: "rgba(246,244,239,0.4)" }}>✕</button>
              </div>
              <div className="p-4 rounded-xl mb-6" style={{ background: "rgba(192,64,64,0.08)", border: "1px solid rgba(192,64,64,0.2)" }}>
                <p className="text-sm" style={{ color: "#c04040" }}>{error}</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => { setStep("confirm"); setError(""); }}
                  className="flex-1 py-3.5 rounded-xl text-sm tracking-widest uppercase"
                  style={{ background: "#5C6B57", color: "#F6F4EF" }}
                  whileHover={{ background: "#4A5645" }}
                >
                  Try Again
                </motion.button>
                <motion.button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)" }}
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
