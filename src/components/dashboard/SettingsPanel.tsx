"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function SettingsPanel() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState({
    sessions:      true,
    announcements: true,
  });

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications(n => ({ ...n, [key]: !n[key] }));

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
            fontWeight: 300,
            color: "#2C2B29",
          }}
        >
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "#4A4845" }}>
          Manage your account preferences
        </p>
      </motion.div>

      {/* Security — change password */}
      <motion.div
        className="p-6 md:p-8 rounded-2xl"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#5C6B57" }}>
          Security
        </p>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem",
            color: "#2C2B29",
            fontWeight: 400,
            marginBottom: "0.5rem",
          }}
        >
          Change Password
        </h3>
        <p className="text-sm mb-5" style={{ color: "#4A4845" }}>
          Update your password or recover access if you&apos;ve forgotten it.
        </p>
        <motion.button
          onClick={() => router.push("/dashboard/settings/change-password")}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm tracking-widest uppercase"
          style={{ border: "1px solid #D4CCBF", color: "#2C2B29", background: "#F6F4EF" }}
          whileHover={{ borderColor: "#5C6B57", background: "#E8E1D6" }}
          whileTap={{ scale: 0.97 }}
        >
          Change Password
          <ChevronRight size={13} />
        </motion.button>
      </motion.div>

      {/* Notification preferences */}
      <motion.div
        className="p-6 md:p-8 rounded-2xl"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.18 }}
      >
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#5C6B57" }}>
          Notifications
        </p>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem",
            color: "#2C2B29",
            fontWeight: 400,
            marginBottom: "1.5rem",
          }}
        >
          Preferences
        </h3>

        <div className="space-y-5">
          {([
            { key: "sessions"      as const, label: "Session Reminders",  desc: "Notify me before live sessions" },
            { key: "announcements" as const, label: "Program Announcements", desc: "Updates from your mentor" },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm" style={{ color: "#2C2B29" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#4A4845" }}>{desc}</p>
              </div>
              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={notifications[key]}
                onClick={() => toggleNotification(key)}
                className="relative inline-flex items-center h-5 w-9 rounded-full flex-shrink-0 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: notifications[key] ? "#5C6B57" : "#D4CCBF",
                  outlineColor: "#5C6B57",
                }}
              >
                <motion.span
                  className="inline-block w-4 h-4 rounded-full"
                  style={{ background: "#F6F4EF" }}
                  animate={{ x: notifications[key] ? 18 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div
        className="p-6 md:p-8 rounded-2xl"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26 }}
      >
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#5C6B57" }}>
          Account
        </p>
        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem",
            color: "#2C2B29",
            fontWeight: 400,
            marginBottom: "0.5rem",
          }}
        >
          Sign Out
        </h3>
        <p className="text-sm mb-5" style={{ color: "#4A4845" }}>
          You will be redirected to the home page.
        </p>
        <motion.button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm tracking-widest uppercase"
          style={{
            border: "1px solid rgba(192,64,64,0.3)",
            color: "#c04040",
            background: "transparent",
          }}
          whileHover={{
            background: "rgba(192,64,64,0.06)",
            borderColor: "rgba(192,64,64,0.5)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={13} />
          Sign Out
        </motion.button>
      </motion.div>
    </div>
  );
}
