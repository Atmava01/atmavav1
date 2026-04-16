"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Moon, CheckCircle2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMentorAssignmentSnapshot,
  getSessionsByMentor,
  getJournalsWithRatingForProgram,
  updateUserProfile,
} from "@/lib/firestore";

const SPECIALTIES = [
  "Hatha Yoga",
  "Vinyasa Flow",
  "Pranayama",
  "Meditation",
  "Restorative",
  "Yin Yoga",
  "Power Yoga",
  "Aerial Yoga",
] as const;

const EXPERIENCE_OPTIONS = [
  "1 year",
  "2 years",
  "3 years",
  "5 years",
  "8 years",
  "10+ years",
] as const;

const BANK_OPTIONS = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "SBI",
  "Kotak Mahindra Bank",
  "Other",
] as const;

const DEFAULT_NOTIFICATIONS = {
  newStudentEnrollments: true,
  sessionReminders30Min: true,
  payoutNotifications: true,
  platformAnnouncements: false,
  studentAtRiskAlerts: true,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #E3DACC",
  background: "#FAF6EE",
  color: "#3B342D",
  fontSize: "14px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#9E9386",
  marginBottom: "8px",
};

type MentorStats = {
  sessionsConducted: number;
  studentsTaught: number;
  averageRating: number;
};

type FormState = {
  name: string;
  phone: string;
  city: string;
  bio: string;
  specializations: string[];
  yearsOfExperience: string;
  certifications: string;
};

type BankState = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountType: "Savings" | "Current";
};

export function MentorAccount() {
  const { user, userProfile, refreshProfile } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    city: "",
    bio: "",
    specializations: [],
    yearsOfExperience: "",
    certifications: "",
  });
  const [bank, setBank] = useState<BankState>({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountType: "Savings",
  });
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [stats, setStats] = useState<MentorStats>({
    sessionsConducted: 0,
    studentsTaught: 0,
    averageRating: 0,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [bankMessage, setBankMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!userProfile) return;
    setForm({
      name: userProfile.name ?? "",
      phone: userProfile.phone ?? "",
      city: userProfile.city ?? "",
      bio: userProfile.bio ?? "",
      specializations: userProfile.specializations ?? (userProfile.specialization ? [userProfile.specialization] : []),
      yearsOfExperience: userProfile.yearsOfExperience ?? "",
      certifications: userProfile.certifications ?? "",
    });
    setNotifications(userProfile.mentorNotificationSettings ?? DEFAULT_NOTIFICATIONS);
    setBank({
      bankName: userProfile.mentorBankDetails?.bankName ?? "",
      accountHolderName: userProfile.mentorBankDetails?.accountHolderName ?? "",
      accountNumber: userProfile.mentorBankDetails?.accountNumber ?? "",
      confirmAccountNumber: userProfile.mentorBankDetails?.accountNumber ?? "",
      ifscCode: userProfile.mentorBankDetails?.ifscCode ?? "",
      accountType: userProfile.mentorBankDetails?.accountType ?? "Savings",
    });
  }, [userProfile]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let cancelled = false;

    async function loadStats() {
      try {
        const token = await currentUser.getIdToken();
        const [{ program, students }, sessions] = await Promise.all([
          getMentorAssignmentSnapshot(token),
          getSessionsByMentor(currentUser.uid),
        ]);

        const journals = program
          ? await getJournalsWithRatingForProgram(program.id)
          : [];

        if (cancelled) return;

        const averageRating = journals.length > 0
          ? journals.reduce((sum, journal) => sum + (journal.rating ?? 0), 0) / journals.length
          : 0;

        setStats({
          sessionsConducted: sessions.length,
          studentsTaught: students.length,
          averageRating,
        });
      } catch {
        if (!cancelled) {
          setStats({
            sessionsConducted: 0,
            studentsTaught: 0,
            averageRating: 0,
          });
        }
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const initials = useMemo(() => {
    const source = form.name || userProfile?.name || "Mentor";
    return source
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [form.name, userProfile?.name]);

  const memberSince = useMemo(() => {
    if (!userProfile?.createdAt) return "—";
    return new Date(userProfile.createdAt).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }, [userProfile?.createdAt]);

  const trainerStatus = userProfile?.trainerStatus ?? (userProfile?.role === "mentor" || userProfile?.role === "admin" ? "approved" : "pending");

  const setTimedMessage = (setter: (value: string) => void, value: string) => {
    setter(value);
    window.setTimeout(() => setter(""), 3000);
  };

  const toggleSpecialty = (specialty: string) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(specialty)
        ? prev.specializations.filter((item) => item !== specialty)
        : [...prev.specializations, specialty],
    }));
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateUserProfile(user.uid, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        bio: form.bio.trim(),
        specializations: form.specializations,
        specialization: form.specializations[0] ?? "",
        yearsOfExperience: form.yearsOfExperience,
        certifications: form.certifications.trim(),
        trainerStatus,
      });
      await refreshProfile();
      setTimedMessage(setProfileMessage, "Profile saved");
    } catch {
      setTimedMessage(setProfileMessage, "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleBankSave = async () => {
    if (!user) return;
    if (bank.accountNumber !== bank.confirmAccountNumber) {
      setTimedMessage(setBankMessage, "Account numbers do not match");
      return;
    }

    setBankSaving(true);
    try {
      await updateUserProfile(user.uid, {
        mentorBankDetails: {
          bankName: bank.bankName.trim(),
          accountHolderName: bank.accountHolderName.trim(),
          accountNumber: bank.accountNumber.trim(),
          ifscCode: bank.ifscCode.trim().toUpperCase(),
          accountType: bank.accountType,
          updatedAt: new Date().toISOString(),
        },
      });
      await refreshProfile();
      setTimedMessage(setBankMessage, "Bank details updated");
    } catch {
      setTimedMessage(setBankMessage, "Could not update bank details");
    } finally {
      setBankSaving(false);
    }
  };

  const toggleNotification = async (key: keyof typeof notifications) => {
    if (!user) return;
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      await updateUserProfile(user.uid, {
        mentorNotificationSettings: next,
      });
      await refreshProfile();
    } catch {
      setNotifications(notifications);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user) return;
    if (newPassword.length < 8) {
      setTimedMessage(setPasswordMessage, "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setTimedMessage(setPasswordMessage, "Passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mentor/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update password");
      }
      setNewPassword("");
      setConfirmPassword("");
      setTimedMessage(setPasswordMessage, "Password updated");
    } catch {
      setTimedMessage(setPasswordMessage, "Could not update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="rounded-[28px] overflow-hidden" style={{ background: "#F7F2E9", border: "1px solid #E5DCCD" }}>
        <div
          className="flex items-start justify-between gap-4 px-6 py-6 md:px-8"
          style={{ borderBottom: "1px solid #E5DCCD" }}
        >
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", color: "#4B3D32", fontWeight: 400 }}>
              My Account
            </h2>
            <p className="text-sm mt-1" style={{ color: "#8F8377" }}>
              Manage your profile and preferences
            </p>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD", color: "#B8AB9B" }}
          >
            <Moon size={15} />
          </button>
        </div>

        <div className="space-y-5 p-5 md:p-6">
          <motion.section
            className="rounded-3xl overflow-hidden"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5DCCD" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", color: "#4B3D32", fontWeight: 400 }}>
                Profile
              </h3>
            </div>

            <div className="p-5 md:p-6">
              <div className="flex items-center gap-4 mb-6">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="mentor avatar"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "#EEE5D9", border: "1px solid #DFD3C4", color: "#9C8D7C", fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: "#4B3D32" }}>Profile Photo</p>
                  <p className="text-xs mt-1" style={{ color: "#9E9386" }}>
                    Your initials are shown as your avatar
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input style={inputStyle} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={{ ...inputStyle, background: "#ECE3D7" }} value={user?.email ?? ""} readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="e.g. Bangalore" />
                </div>
              </div>

              <div className="mt-4">
                <label style={labelStyle}>Bio</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Share your yoga journey, teaching philosophy, and what makes your sessions special..."
                />
              </div>

              <div className="mt-5">
                <label style={labelStyle}>Specialties</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SPECIALTIES.map((specialty) => {
                    const checked = form.specializations.includes(specialty);
                    return (
                      <label key={specialty} className="flex items-center gap-2 text-sm" style={{ color: "#5D5246" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSpecialty(specialty)}
                        />
                        <span>{specialty}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div>
                  <label style={labelStyle}>Years of Experience</label>
                  <select
                    style={inputStyle}
                    value={form.yearsOfExperience}
                    onChange={(e) => setForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Certifications</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                    value={form.certifications}
                    onChange={(e) => setForm((prev) => ({ ...prev, certifications: e.target.value }))}
                    placeholder="e.g. RYT-500, Iyengar Level 2..."
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "#7A8C74", color: "#FFF9F1" }}
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
                {profileMessage && (
                  <span className="text-sm" style={{ color: profileMessage.includes("saved") ? "#6F8667" : "#B75050" }}>
                    {profileMessage}
                  </span>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-3xl overflow-hidden"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid #E5DCCD" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", color: "#4B3D32", fontWeight: 400 }}>
                Trainer Status
              </h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] tracking-widest uppercase"
                style={{
                  background: trainerStatus === "approved" ? "rgba(122,140,116,0.14)" : "rgba(212,168,71,0.12)",
                  color: trainerStatus === "approved" ? "#6F8667" : "#B58A38",
                }}
              >
                <CheckCircle2 size={12} />
                {trainerStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 md:p-6">
              {[
                { label: "Member Since", value: memberSince, sub: new Date(userProfile?.createdAt ?? Date.now()).getFullYear().toString() },
                { label: "Sessions Conducted", value: String(stats.sessionsConducted), sub: "sessions" },
                { label: "Students Taught", value: String(stats.studentsTaught), sub: "active students" },
                { label: "Average Rating", value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—", sub: stats.averageRating > 0 ? "average rating" : "no ratings yet" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-4 text-center"
                  style={{ background: "#EEE5D9", border: "1px solid #E3DACC" }}
                >
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.7rem", color: "#5B4A3B", fontWeight: 400 }}>
                    {item.label === "Average Rating" && stats.averageRating > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {item.value}
                        <Star size={15} style={{ color: "#D8A44A" }} fill="#D8A44A" />
                      </span>
                    ) : item.value}
                  </p>
                  <p className="text-[11px] mt-2" style={{ color: "#8C8073" }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: "#8C8073" }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="rounded-3xl overflow-hidden"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="px-5 py-4 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid #E5DCCD" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", color: "#4B3D32", fontWeight: 400 }}>
                Bank Details
              </h3>
              <span className="text-xs" style={{ color: "#A39688" }}>For payouts</span>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Bank Name</label>
                  <select style={inputStyle} value={bank.bankName} onChange={(e) => setBank((prev) => ({ ...prev, bankName: e.target.value }))}>
                    <option value="">Select bank</option>
                    {BANK_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Account Holder Name</label>
                  <input style={inputStyle} value={bank.accountHolderName} onChange={(e) => setBank((prev) => ({ ...prev, accountHolderName: e.target.value }))} placeholder="Name as per bank records" />
                </div>
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <input style={inputStyle} value={bank.accountNumber} onChange={(e) => setBank((prev) => ({ ...prev, accountNumber: e.target.value }))} placeholder="Enter account number" />
                </div>
                <div>
                  <label style={labelStyle}>Confirm Account Number</label>
                  <input style={inputStyle} value={bank.confirmAccountNumber} onChange={(e) => setBank((prev) => ({ ...prev, confirmAccountNumber: e.target.value }))} placeholder="Re-enter account number" />
                </div>
                <div>
                  <label style={labelStyle}>IFSC Code</label>
                  <input style={inputStyle} value={bank.ifscCode} onChange={(e) => setBank((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))} placeholder="e.g. HDFC0001234" />
                </div>
                <div>
                  <label style={labelStyle}>Account Type</label>
                  <select
                    style={inputStyle}
                    value={bank.accountType}
                    onChange={(e) => setBank((prev) => ({ ...prev, accountType: e.target.value as "Savings" | "Current" }))}
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBankSave}
                  disabled={bankSaving}
                  className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "#7A8C74", color: "#FFF9F1" }}
                >
                  {bankSaving ? "Updating..." : "Update Bank Details"}
                </button>
                {bankMessage && (
                  <span className="text-sm" style={{ color: bankMessage.includes("updated") ? "#6F8667" : "#B75050" }}>
                    {bankMessage}
                  </span>
                )}
              </div>

              <p className="text-xs mt-4" style={{ color: "#AEA293" }}>
                Your bank details are encrypted and securely stored. Changes will be verified before the next payout.
              </p>
            </div>
          </motion.section>

          <motion.section
            className="rounded-3xl overflow-hidden"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5DCCD" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", color: "#4B3D32", fontWeight: 400 }}>
                Notifications
              </h3>
            </div>

            <div className="p-2 md:p-3">
              {[
                { key: "newStudentEnrollments" as const, label: "New student enrollments", desc: "Get notified when a student joins your batch" },
                { key: "sessionReminders30Min" as const, label: "Session reminders 30 min before", desc: "Reminder before each scheduled session" },
                { key: "payoutNotifications" as const, label: "Payout notifications", desc: "When your payout is processed or received" },
                { key: "platformAnnouncements" as const, label: "Platform announcements", desc: "Product updates and platform news" },
                { key: "studentAtRiskAlerts" as const, label: "Student at-risk alerts", desc: "When a student misses 3 or more sessions" },
              ].map((item, index, list) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                  style={{ borderBottom: index < list.length - 1 ? "1px solid #E5DCCD" : "none" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#4B3D32" }}>{item.label}</p>
                    <p className="text-xs mt-1" style={{ color: "#9E9386" }}>{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications[item.key]}
                    onClick={() => toggleNotification(item.key)}
                    className="relative inline-flex h-6 w-11 rounded-full transition-colors"
                    style={{ background: notifications[item.key] ? "#7A8C74" : "#D9D0C3" }}
                  >
                    <motion.span
                      className="absolute top-1 h-4 w-4 rounded-full bg-white"
                      animate={{ x: notifications[item.key] ? 24 : 4 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            className="rounded-3xl overflow-hidden"
            style={{ background: "#FBF7F0", border: "1px solid #E5DCCD" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E5DCCD" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", color: "#4B3D32", fontWeight: 400 }}>
                Change Password
              </h3>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    type="password"
                    style={inputStyle}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={passwordSaving}
                  className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "#FFFFFF", color: "#4B3D32", border: "1px solid #E3DACC" }}
                >
                  {passwordSaving ? "Updating..." : "Update Password"}
                </button>
                {passwordMessage && (
                  <span className="text-sm" style={{ color: passwordMessage.includes("updated") ? "#6F8667" : "#B75050" }}>
                    {passwordMessage}
                  </span>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
