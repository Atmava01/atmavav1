"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Mail, Check, AlertCircle, ArrowRight,
  CreditCard, Smartphone, ToggleLeft, ToggleRight,
  FileText, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveEnrollment,
  getProgramById,
  getPaymentById,
  getPaymentsByUser,
  getAutopaymentSetup,
  setAutopaymentSetup,
  disableAutopayment,
} from "@/lib/firestore";
import type { Enrollment, Payment, Program, AutopaymentSetup } from "@/types";
import Link from "next/link";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateLong(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function paise2inr(paise: number) {
  return (paise / 100).toLocaleString("en-IN");
}

/** Compute GST-exclusive base and GST from total (GST inclusive). */
function splitGst(totalPaise: number) {
  // total = base * 1.18 → base = total / 1.18
  const base = Math.round(totalPaise / 1.18);
  const gst = totalPaise - base;
  return { base, gst };
}

function daysBetween(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
}

function daysSince(start: string) {
  const s = new Date(start + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - s.getTime()) / 86400000));
}

function generateRef(paymentId: string) {
  const year = new Date().getFullYear();
  const suffix = paymentId.slice(-6).toUpperCase();
  return `ATM-${year}-${suffix}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const PROGRAM_NAMES: Record<string, string> = {
  "30": "30-Day Foundation",
  "60": "60-Day Deepening",
  "90": "90-Day Inner Mastery",
};

const PROGRAM_DURATIONS: Record<string, number> = {
  "30": 30, "60": 60, "90": 90,
};

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: "#D4CCBF", borderTopColor: "#5C6B57" }}
      />
    </div>
  );
}

// ─── Section fade-in ─────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── 1. Current Enrollment Card ───────────────────────────────────────────────

function EnrollmentCard({
  enrollment,
  program,
  payment,
  onDownload,
  onEmail,
  emailSent,
}: {
  enrollment: Enrollment;
  program: Program | null;
  payment: Payment | null;
  onDownload: () => void;
  onEmail: () => void;
  emailSent: boolean;
}) {
  const programName = program?.title ?? PROGRAM_NAMES[enrollment.programId] ?? enrollment.programId;
  const totalDays = PROGRAM_DURATIONS[enrollment.programId] ?? daysBetween(enrollment.startDate, enrollment.endDate);
  const dayDone = daysSince(enrollment.startDate);
  const dayX = Math.min(dayDone + 1, totalDays);
  const progress = Math.min(100, (dayDone / totalDays) * 100);
  const price = payment ? paise2inr(payment.amount) : null;
  const ref = payment?.razorpayPaymentId
    ? generateRef(payment.razorpayPaymentId)
    : enrollment.paymentId
    ? generateRef(enrollment.paymentId)
    : null;

  // Determine payment method label from razorpayPaymentId prefix
  // Razorpay UPI payments start with "pay_" and may have vpa info. We just show a generic label.
  const paymentMethod = enrollment.grantedByAdmin ? "Complimentary" : "UPI";

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#1E1A14", color: "#F6F4EF" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <p
          className="text-[10px] tracking-[0.15em] uppercase"
          style={{ color: "#C8A96E", fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.12em" }}
        >
          Current Enrollment
        </p>
        <div className="text-right">
          {price && (
            <p className="text-base font-semibold" style={{ color: "#F6F4EF" }}>₹{price}</p>
          )}
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(246,244,239,0.45)" }}>
            {enrollment.grantedByAdmin ? "Complimentary" : `Paid · ${paymentMethod}`}
          </p>
        </div>
      </div>

      {/* Program name */}
      <h2
        className="text-3xl mb-4"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", lineHeight: 1.15 }}
      >
        {programName}
      </h2>

      {/* Badges row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span
          className="text-[10px] px-2.5 py-1 rounded-full tracking-wide"
          style={{ background: "rgba(92,143,87,0.22)", color: "#7EC87A", border: "1px solid rgba(92,143,87,0.35)" }}
        >
          ACTIVE
        </span>
        {ref && (
          <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.4)" }}>
            Ref: {ref}
          </span>
        )}
      </div>

      {/* Details row */}
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-xs"
        style={{ color: "rgba(246,244,239,0.55)" }}
      >
        <div>
          <span style={{ color: "rgba(246,244,239,0.35)" }}>Batch</span>
          <span className="ml-2" style={{ color: "#F6F4EF" }}>{enrollment.batch}</span>
        </div>
        <div>
          <span style={{ color: "rgba(246,244,239,0.35)" }}>Guide</span>
          <span className="ml-2" style={{ color: "#F6F4EF" }}>{program?.mentorName ?? "—"}</span>
        </div>
        <div>
          <span style={{ color: "rgba(246,244,239,0.35)" }}>Dates</span>
          <span className="ml-2" style={{ color: "#F6F4EF" }}>
            {fmtDate(enrollment.startDate)} – {fmtDate(enrollment.endDate)}
          </span>
        </div>
        <div>
          <span style={{ color: "rgba(246,244,239,0.35)" }}>Payment</span>
          <span className="ml-2" style={{ color: "#F6F4EF" }}>
            {enrollment.grantedByAdmin ? "Complimentary" : payment?.status === "paid" ? "Paid" : "—"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: "#C8A96E", fontFamily: "'Cormorant Garamond', serif" }}
        >
          Day {dayX} of {totalDays}
        </span>
        <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="rounded-full h-1.5 mb-2" style={{ background: "rgba(246,244,239,0.1)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#C8A96E,#E8C98A)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>
        <span>{fmtDate(enrollment.startDate)}</span>
        <span>{fmtDate(enrollment.endDate)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <motion.button
          onClick={onDownload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium flex-1 justify-center"
          style={{
            background: "transparent",
            color: "#F6F4EF",
            border: "1px solid rgba(246,244,239,0.25)",
          }}
          whileHover={{ background: "rgba(246,244,239,0.07)" }}
          whileTap={{ scale: 0.97 }}
        >
          <Download size={13} />
          Download Invoice
        </motion.button>
        <motion.button
          onClick={onEmail}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs flex-1 justify-center"
          style={{
            background: "transparent",
            color: "#F6F4EF",
            border: "1px solid rgba(246,244,239,0.25)",
          }}
          whileHover={{ background: "rgba(246,244,239,0.07)" }}
          whileTap={{ scale: 0.97 }}
        >
          <AnimatePresence mode="wait">
            {emailSent ? (
              <motion.span key="sent" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Check size={13} style={{ color: "#7EC87A" }} />
                <span style={{ color: "#7EC87A" }}>Sent!</span>
              </motion.span>
            ) : (
              <motion.span key="send" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Mail size={13} />
                Email Receipt
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

// ─── 2. Upgrade Card ─────────────────────────────────────────────────────────

function UpgradeCard({ currentProgramId }: { currentProgramId: string }) {
  if (currentProgramId === "90") return null;

  const upgradeTo = currentProgramId === "30" ? "60-Day Deepening" : "90-Day Inner Mastery";
  const priceDiff = currentProgramId === "30" ? 170 : 100;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#EAF0E6", border: "1px solid #C5D4BF" }}
    >
      <p
        className="text-base font-medium mb-1.5"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontSize: "1.15rem" }}
      >
        Upgrade to {upgradeTo}
      </p>
      <p className="text-xs mb-4" style={{ color: "#4A5845", lineHeight: 1.65 }}>
        Pay only ₹{priceDiff} more (difference pricing) — your streak and progress carry over seamlessly.
      </p>
      <Link href="/programs">
        <motion.button
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium"
          style={{ background: "#3B4F37", color: "#F6F4EF" }}
          whileHover={{ background: "#2C3B29" }}
          whileTap={{ scale: 0.97 }}
        >
          Upgrade Now <ArrowRight size={12} />
        </motion.button>
      </Link>
    </div>
  );
}

// ─── 3. Invoice History ───────────────────────────────────────────────────────

function InvoiceHistory({
  payments,
  onExportCsv,
}: {
  payments: Payment[];
  onExportCsv: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#fff", border: "1px solid #D4CCBF" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileText size={15} style={{ color: "#5C6B57" }} />
          <p
            className="text-base"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontSize: "1.05rem" }}
          >
            Invoice History
          </p>
        </div>
        <motion.button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#F6F4EF", color: "#5C6B57", border: "1px solid #D4CCBF" }}
          whileHover={{ background: "#EDE8E0" }}
          whileTap={{ scale: 0.97 }}
        >
          <Download size={11} />
          Export CSV
        </motion.button>
      </div>

      {payments.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: "#9A9490" }}>No payment history found.</p>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #E8E1D6" }}>
                {["Invoice No.", "Program", "Date", "Amount", "GST (18%)", "Total", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-2.5 whitespace-nowrap"
                    style={{ color: "#9A9490", fontWeight: 500, letterSpacing: "0.04em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const { base, gst } = splitGst(p.amount);
                const invoiceNum = p.razorpayPaymentId
                  ? `INV-${p.razorpayPaymentId.slice(-6).toUpperCase()}`
                  : `INV-${p.id.slice(-6).toUpperCase()}`;
                const programLabel = PROGRAM_NAMES[p.programId] ?? p.programId;
                const isComp = p.status !== "paid";

                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: "1px solid #F0EBE3" }}
                  >
                    <td className="px-6 py-3 font-mono whitespace-nowrap" style={{ color: "#2C2B29" }}>
                      {invoiceNum}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap" style={{ color: "#2C2B29" }}>
                      {programLabel}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap" style={{ color: "#4A4845" }}>
                      {fmtDateTime(p.createdAt)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap" style={{ color: "#4A4845" }}>
                      {isComp ? "—" : `₹${paise2inr(base)}`}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap" style={{ color: "#4A4845" }}>
                      {isComp ? "—" : `₹${paise2inr(gst)}`}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap font-medium" style={{ color: "#2C2B29" }}>
                      {isComp ? "—" : `₹${paise2inr(p.amount)}`}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide"
                        style={
                          isComp
                            ? { background: "#F0EBE3", color: "#9A9490" }
                            : { background: "rgba(92,107,87,0.12)", color: "#5C6B57" }
                        }
                      >
                        {isComp ? "Complimentary" : "Paid"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {!isComp && (
                        <motion.button
                          className="text-xs flex items-center gap-1"
                          style={{ color: "#5C6B57" }}
                          whileHover={{ opacity: 0.7 }}
                        >
                          <Download size={11} />
                          PDF
                        </motion.button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 4. Autopayment & Payment Methods ────────────────────────────────────────

type AutopayForm = { method: "upi" | "card"; upiId: string; card: string; expiry: string; cvv: string };

function PaymentMethodsCard({
  payments,
  autopay,
  onSaveAutopay,
  onDisableAutopay,
  saving,
}: {
  payments: Payment[];
  autopay: AutopaymentSetup | null;
  onSaveAutopay: (data: Omit<AutopaymentSetup, "userId" | "updatedAt">) => Promise<void>;
  onDisableAutopay: () => Promise<void>;
  saving: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AutopayForm>({ method: "upi", upiId: "", card: "", expiry: "", cvv: "" });
  const [toggling, setToggling] = useState(false);
  const isEnabled = autopay?.enabled ?? false;

  const handleToggle = async () => {
    if (toggling || saving) return;
    setToggling(true);
    if (isEnabled) {
      await onDisableAutopay();
      setShowForm(false);
    } else {
      setShowForm(true);
    }
    setToggling(false);
  };

  const handleSubmitForm = async () => {
    if (saving) return;
    const nextCharge = addDays(new Date(), 30);
    await onSaveAutopay({
      enabled: true,
      method: form.method,
      upiId: form.method === "upi" ? form.upiId : undefined,
      last4: form.method === "card" ? form.card.slice(-4) : undefined,
      nextChargeDate: nextCharge.toISOString().split("T")[0],
      nextChargeAmount: 27900, // ₹279 example; ideally from program price
    });
    setShowForm(false);
  };

  // Derive saved methods from payment history
  const savedMethods: { label: string; detail: string }[] = [];
  if (autopay?.method === "upi" && autopay.upiId) {
    savedMethods.push({ label: "UPI", detail: autopay.upiId });
  } else if (autopay?.method === "card" && autopay.last4) {
    savedMethods.push({ label: "Card", detail: `···· ${autopay.last4}` });
  } else if (payments.length > 0) {
    savedMethods.push({ label: "UPI", detail: "via Razorpay" });
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#fff", border: "1px solid #D4CCBF" }}
    >
      <p
        className="text-base mb-5"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontSize: "1.05rem" }}
      >
        Payment Methods &amp; Autopayment
      </p>

      {/* Saved methods */}
      {savedMethods.length > 0 && (
        <div className="space-y-2 mb-5">
          {savedMethods.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "#F6F4EF", border: "1px solid #E8E1D6" }}
            >
              {m.label === "UPI" ? (
                <Smartphone size={15} style={{ color: "#5C6B57" }} />
              ) : (
                <CreditCard size={15} style={{ color: "#5C6B57" }} />
              )}
              <div>
                <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{m.label}</p>
                <p className="text-[10px]" style={{ color: "#9A9490" }}>{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Autopayment toggle card */}
      <div
        className="rounded-xl px-4 py-4"
        style={{ background: "#F6F4EF", border: "1px solid #E8E1D6" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium mb-0.5" style={{ color: "#2C2B29" }}>
              Enable Autopayment
            </p>
            <p className="text-xs" style={{ color: "#9A9490", maxWidth: "26ch", lineHeight: 1.6 }}>
              Automatically renew your program. Never miss a day.
            </p>
            {isEnabled && autopay?.nextChargeDate && (
              <p className="text-[10px] mt-2" style={{ color: "#5C6B57" }}>
                Next charge: {fmtDate(autopay.nextChargeDate)} · ₹{paise2inr(autopay.nextChargeAmount ?? 0)}
              </p>
            )}
          </div>
          <motion.button
            onClick={handleToggle}
            className="mt-0.5 flex-shrink-0"
            whileTap={{ scale: 0.93 }}
            aria-label="Toggle autopayment"
          >
            {isEnabled ? (
              <ToggleRight size={32} style={{ color: "#5C6B57" }} />
            ) : (
              <ToggleLeft size={32} style={{ color: "#C8C3BC" }} />
            )}
          </motion.button>
        </div>

        {/* Setup form */}
        <AnimatePresence>
          {showForm && !isEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E8E1D6" }}>
                {/* Method tabs */}
                <div className="flex gap-2 mb-4">
                  {(["upi", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm(f => ({ ...f, method: m }))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={
                        form.method === m
                          ? { background: "#5C6B57", color: "#F6F4EF" }
                          : { background: "#E8E1D6", color: "#4A4845" }
                      }
                    >
                      {m === "upi" ? "UPI ID" : "Card"}
                    </button>
                  ))}
                </div>

                {form.method === "upi" ? (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "#9A9490" }}>
                      UPI ID
                    </label>
                    <input
                      type="text"
                      placeholder="yourname@upi"
                      value={form.upiId}
                      onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ border: "1px solid #D4CCBF", background: "#fff", color: "#2C2B29" }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "#9A9490" }}>
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="•••• •••• •••• ••••"
                        maxLength={19}
                        value={form.card}
                        onChange={e => setForm(f => ({ ...f, card: e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim() }))}
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                        style={{ border: "1px solid #D4CCBF", background: "#fff", color: "#2C2B29" }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "#9A9490" }}>
                          Expiry
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={form.expiry}
                          onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                          style={{ border: "1px solid #D4CCBF", background: "#fff", color: "#2C2B29" }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "#9A9490" }}>
                          CVV
                        </label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={form.cvv}
                          onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                          style={{ border: "1px solid #D4CCBF", background: "#fff", color: "#2C2B29" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <motion.button
                    onClick={handleSubmitForm}
                    disabled={saving || (form.method === "upi" ? !form.upiId.includes("@") : form.card.length < 12)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "#5C6B57", color: "#F6F4EF", opacity: saving ? 0.7 : 1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving ? "Saving…" : "Save & Enable"}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg text-xs"
                    style={{ background: "#E8E1D6", color: "#4A4845" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main BillingPanel ────────────────────────────────────────────────────────

export function BillingPanel() {
  const { user, userProfile } = useAuth();

  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [program, setProgram] = useState<Program | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [autopay, setAutopay] = useState<AutopaymentSetup | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [savingAutopay, setSavingAutopay] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [e, payments, ap] = await Promise.all([
        getActiveEnrollment(user.uid),
        getPaymentsByUser(user.uid),
        getAutopaymentSetup(user.uid),
      ]);
      setEnrollment(e);
      setAllPayments(payments);
      setAutopay(ap);

      if (e?.paymentId) {
        const p = await getPaymentById(e.paymentId);
        setPayment(p);
      }
      if (e?.programId) {
        const prog = await getProgramById(e.programId);
        setProgram(prog);
      }
    })();
  }, [user]);

  const handleDownloadInvoice = useCallback(() => {
    if (!enrollment) return;
    const p = payment;
    const programName = program?.title ?? PROGRAM_NAMES[enrollment.programId] ?? enrollment.programId;
    const sep = "─".repeat(46);
    const lines = [
      "ĀTMAVA",
      "Payment Invoice",
      sep,
      "",
      `Invoice Date  : ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      p ? `Payment Date  : ${fmtDateTime(p.createdAt)}` : "Access Type   : Admin Granted",
      "",
      sep,
      "PROGRAM DETAILS",
      sep,
      `Program       : ${programName}`,
      `Batch         : ${enrollment.batch}`,
      `Level         : ${enrollment.level}`,
      `Access Period : ${fmtDateLong(enrollment.startDate)} → ${fmtDateLong(enrollment.endDate)}`,
      "",
      sep,
      "PAYMENT DETAILS",
      sep,
      p ? `Amount Paid   : ₹${paise2inr(p.amount)}` : "Amount        : Complimentary",
      p ? `Status        : ${p.status.toUpperCase()}` : "",
      p?.razorpayPaymentId ? `Payment ID    : ${p.razorpayPaymentId}` : "",
      p ? `Order ID      : ${p.razorpayOrderId}` : "",
      p ? `Mode          : ${p.mode === "live" ? "Live" : "Test"}` : "",
      "",
      sep,
      "",
      "Thank you for joining Ātmava.",
      "For support: support@atmava.com",
      "atmava.com",
    ].filter(l => l !== undefined);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atmava-invoice-${p?.id ?? enrollment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [enrollment, payment, program]);

  const handleEmailReceipt = useCallback(() => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (allPayments.length === 0) return;
    const rows = [
      ["Invoice No.", "Program", "Date", "Base Amount (INR)", "GST 18% (INR)", "Total (INR)", "Status"],
      ...allPayments.map(p => {
        const { base, gst } = splitGst(p.amount);
        const invoiceNum = p.razorpayPaymentId
          ? `INV-${p.razorpayPaymentId.slice(-6).toUpperCase()}`
          : `INV-${p.id.slice(-6).toUpperCase()}`;
        return [
          invoiceNum,
          PROGRAM_NAMES[p.programId] ?? p.programId,
          fmtDateTime(p.createdAt),
          p.status === "paid" ? (base / 100).toFixed(2) : "0",
          p.status === "paid" ? (gst / 100).toFixed(2) : "0",
          p.status === "paid" ? (p.amount / 100).toFixed(2) : "0",
          p.status === "paid" ? "Paid" : "Complimentary",
        ];
      }),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atmava-invoices.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allPayments]);

  const handleSaveAutopay = useCallback(async (data: Omit<AutopaymentSetup, "userId" | "updatedAt">) => {
    if (!user) return;
    setSavingAutopay(true);
    await setAutopaymentSetup(user.uid, data);
    const updated = await getAutopaymentSetup(user.uid);
    setAutopay(updated);
    setSavingAutopay(false);
  }, [user]);

  const handleDisableAutopay = useCallback(async () => {
    if (!user) return;
    setSavingAutopay(true);
    await disableAutopayment(user.uid);
    const updated = await getAutopaymentSetup(user.uid);
    setAutopay(updated);
    setSavingAutopay(false);
  }, [user]);

  // Loading
  if (enrollment === undefined) return <Spinner />;

  // No enrollment
  if (!enrollment) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <AlertCircle size={40} style={{ color: "#D4CCBF", margin: "0 auto 12px" }} />
        <p className="text-sm" style={{ color: "#4A4845" }}>You don&apos;t have an active enrollment.</p>
        <Link href="/programs">
          <motion.button
            className="mt-4 px-5 py-2.5 rounded-xl text-sm"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
            whileHover={{ background: "#4A5845" }}
            whileTap={{ scale: 0.97 }}
          >
            Browse Programs
          </motion.button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Page title */}
      <div>
        <h1
          className="text-2xl"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}
        >
          Billing
        </h1>
        <p className="text-xs mt-1" style={{ color: "#4A4845" }}>
          Enrollment, payments, and autopayment settings
        </p>
      </div>

      {/* 1. Current Enrollment Card */}
      <Section delay={0}>
        <EnrollmentCard
          enrollment={enrollment}
          program={program}
          payment={payment}
          onDownload={handleDownloadInvoice}
          onEmail={handleEmailReceipt}
          emailSent={emailSent}
        />
      </Section>

      {/* 2. Upgrade Card */}
      <Section delay={0.08}>
        <UpgradeCard currentProgramId={enrollment.programId} />
      </Section>

      {/* 3. Invoice History */}
      <Section delay={0.14}>
        <InvoiceHistory payments={allPayments} onExportCsv={handleExportCsv} />
      </Section>

      {/* 4. Payment Methods & Autopayment */}
      <Section delay={0.2}>
        <PaymentMethodsCard
          payments={allPayments}
          autopay={autopay}
          onSaveAutopay={handleSaveAutopay}
          onDisableAutopay={handleDisableAutopay}
          saving={savingAutopay}
        />
      </Section>
    </div>
  );
}
