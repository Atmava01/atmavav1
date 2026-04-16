"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export function ProfilePanel() {
  const { user, userProfile } = useAuth();
  const [name, setName]   = useState(userProfile?.name ?? "");
  const [saved, setSaved] = useState(false);

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

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
          My Profile
        </h2>
        <p className="text-sm mt-1" style={{ color: "#4A4845" }}>
          Your personal information
        </p>
      </motion.div>

      {/* Profile card */}
      <motion.div
        className="p-6 md:p-8 rounded-2xl"
        style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              alt="avatar"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl flex-shrink-0 select-none"
              style={{ background: "#5C6B57", color: "#F6F4EF" }}
            >
              {initials}
            </div>
          )}
          <div>
            <p className="font-medium" style={{ color: "#2C2B29" }}>
              {userProfile?.name ?? "Member"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#4A4845" }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-5">
          <div>
            <label
              className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: "#4A4845" }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setSaved(false);
              }}
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "#E8E1D6",
                border: "1px solid #D4CCBF",
                color: "#2C2B29",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#5C6B57")}
              onBlur={e => (e.currentTarget.style.borderColor = "#D4CCBF")}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label
              className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: "#4A4845" }}
            >
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none cursor-not-allowed"
              style={{
                background: "rgba(212,204,191,0.4)",
                border: "1px solid #D4CCBF",
                color: "#4A4845",
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#4A4845" }}>
              Email address cannot be changed.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="mt-7 flex items-center gap-3">
          <motion.button
            onClick={() => setSaved(true)}
            className="px-6 py-2.5 rounded-xl text-sm tracking-widest uppercase"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
            whileHover={{ background: "#4A5645", boxShadow: "0 6px 20px rgba(92,107,87,0.2)" }}
            whileTap={{ scale: 0.97 }}
          >
            Save Changes
          </motion.button>
          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs"
              style={{ color: "#5C6B57" }}
            >
              Saved ✓
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Current program info */}
      {userProfile?.programTitle && (
        <motion.div
          className="p-6 rounded-2xl"
          style={{ background: "#E8E1D6", border: "1px solid #D4CCBF" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p
            className="text-xs tracking-widest uppercase mb-2"
            style={{ color: "#5C6B57" }}
          >
            Current Program
          </p>
          <p style={{ color: "#2C2B29" }}>{userProfile.programTitle}</p>
        </motion.div>
      )}
    </div>
  );
}
