"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { getPrograms, upsertProgram, getAllMentors } from "@/lib/firestore";
import type { Program, UserProfile } from "@/types";

type BatchRow  = { name: string; time: string };

function emptyProgram(): Program {
  return {
    id: "30",
    title: "",
    duration: 30,
    description: "",
    price: 14900,
    isActive: true,
    isFree: false,
    features: [],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [{ name: "Morning", time: "6:30 AM" }, { name: "Evening", time: "6:00 PM" }],
    levels: ["Beginner", "Intermediate", "Advanced"],
  };
}

export function ProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors]   = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Program | null>(null);
  const [saving, setSaving]     = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [levelInput, setLevelInput]     = useState("");

  useEffect(() => {
    Promise.all([getPrograms(), getAllMentors()])
      .then(([progs, ments]) => {
        setPrograms(progs.sort((a, b) => Number(a.id) - Number(b.id)));
        setMentors(ments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleEdit = (p: Program) => {
    setEditing({
      ...p,
      features: [...(p.features ?? [])],
      batches:  [...(p.batches ?? [])],
      levels:   [...(p.levels ?? [])],
      mentorId:   p.mentorId ?? null,
      mentorName: p.mentorName ?? null,
    });
    setFeatureInput(""); setLevelInput("");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertProgram(editing);
      setPrograms(ps => ps.map(p => p.id === editing.id ? editing : p));
      setEditing(null);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleToggleActive = async (p: Program) => {
    const updated = { ...p, isActive: !p.isActive };
    await upsertProgram(updated).catch(() => {});
    setPrograms(ps => ps.map(x => x.id === p.id ? updated : x));
  };

  // Features
  const addFeature = () => {
    if (!editing || !featureInput.trim()) return;
    setEditing({ ...editing, features: [...editing.features, featureInput.trim()] });
    setFeatureInput("");
  };
  const removeFeature = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, features: editing.features.filter((_, idx) => idx !== i) });
  };

  // Batches
  const addBatch = () => {
    if (!editing) return;
    setEditing({ ...editing, batches: [...editing.batches, { name: "", time: "" }] });
  };
  const updateBatch = (i: number, field: keyof BatchRow, value: string) => {
    if (!editing) return;
    const batches = editing.batches.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
    setEditing({ ...editing, batches });
  };
  const removeBatch = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, batches: editing.batches.filter((_, idx) => idx !== i) });
  };

  // Levels
  const addLevel = () => {
    if (!editing || !levelInput.trim()) return;
    setEditing({ ...editing, levels: [...editing.levels, levelInput.trim()] });
    setLevelInput("");
  };
  const removeLevel = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, levels: editing.levels.filter((_, idx) => idx !== i) });
  };

  // Mentor assignment
  const assignMentor = (mentorId: string) => {
    if (!editing) return;
    if (!mentorId) {
      setEditing({ ...editing, mentorId: null, mentorName: null });
      return;
    }
    const mentor = mentors.find(m => m.uid === mentorId);
    setEditing({ ...editing, mentorId, mentorName: mentor?.name ?? null });
  };

  const getMentorName = (program: Program) => {
    if (!program.mentorId) return null;
    return program.mentorName ?? mentors.find(m => m.uid === program.mentorId)?.name ?? program.mentorId;
  };

  const LABELS: Record<string, string> = { "30": "Foundation", "60": "Deepening", "90": "Inner Mastery" };

  return (
    <div className="space-y-5">
      <motion.h2
        className="text-2xl"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Programs
      </motion.h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((p, i) => (
            <motion.div
              key={p.id}
              className="p-6 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", color: "#F6F4EF", fontWeight: 300 }}>
                      {p.title || `${p.id}-Day ${LABELS[p.id] ?? "Program"}`}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: p.isActive ? "rgba(122,140,116,0.15)" : "rgba(255,255,255,0.05)",
                      color: p.isActive ? "#7A8C74" : "rgba(246,244,239,0.3)",
                      border: `1px solid ${p.isActive ? "rgba(122,140,116,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: "rgba(246,244,239,0.5)" }}>{p.description}</p>

                  {/* Mentor */}
                  <p className="text-xs mb-1" style={{ color: "rgba(246,244,239,0.35)" }}>
                    Mentor: <span style={{ color: getMentorName(p) ? "#7A8C74" : "rgba(246,244,239,0.25)" }}>
                      {getMentorName(p) ?? "Unassigned"}
                    </span>
                  </p>

                  {/* Batches */}
                  {p.batches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {p.batches.map(b => (
                        <span key={b.name} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.1)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.2)" }}>
                          {b.name} · {b.time}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Levels */}
                  {p.levels?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.levels.map(l => (
                        <span key={l} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                    <span>{p.duration} days</span>
                    <span>₹{(p.price / 100).toFixed(0)}</span>
                    <span>{p.enrolledCount ?? 0} enrolled</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <motion.button
                    onClick={() => handleToggleActive(p)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </motion.button>
                  <motion.button
                    onClick={() => handleEdit(p)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}
                    whileHover={{ background: "rgba(122,140,116,0.25)" }}
                  >
                    Edit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl p-6 space-y-5 mb-8"
              style={{ background: "#1E1D1B", border: "1px solid rgba(255,255,255,0.1)" }}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
            >
              <div className="flex items-center justify-between">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "#F6F4EF", fontWeight: 300 }}>
                  Edit Program — {editing.id} Day
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: "rgba(246,244,239,0.4)" }}>✕</button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Title</label>
                  <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }} />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Description</label>
                  <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                    rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }} />
                </div>

                {/* Price + Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Price (paise)</label>
                    <input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }} />
                    <p className="text-xs mt-1" style={{ color: "rgba(246,244,239,0.3)" }}>₹{(editing.price / 100).toFixed(0)}</p>
                  </div>
                  <div>
                    <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Duration (days)</label>
                    <input type="number" value={editing.duration} onChange={e => setEditing({ ...editing, duration: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }} />
                  </div>
                </div>

                {/* Active/Free */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm" style={{ color: "rgba(246,244,239,0.7)" }}>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.isFree} onChange={e => setEditing({ ...editing, isFree: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm" style={{ color: "rgba(246,244,239,0.7)" }}>Free</span>
                  </label>
                </div>

                {/* Mentor */}
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Assign Mentor</label>
                  <select value={editing.mentorId ?? ""} onChange={e => assignMentor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(40,38,36,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#F6F4EF" }}>
                    <option value="">— Unassigned —</option>
                    {mentors.map(m => <option key={m.uid} value={m.uid}>{m.name} ({m.email})</option>)}
                  </select>
                </div>

                {/* Batches */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-widest uppercase" style={{ color: "#7A8C74" }}>Batches</label>
                    <motion.button onClick={addBatch} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74" }} whileHover={{ background: "rgba(122,140,116,0.25)" }}>
                      <Plus size={10} /> Add Batch
                    </motion.button>
                  </div>
                  <div className="space-y-2">
                    {editing.batches.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input value={b.name} onChange={e => updateBatch(idx, "name", e.target.value)}
                          placeholder="Name (e.g. Morning)"
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F6F4EF" }} />
                        <input value={b.time} onChange={e => updateBatch(idx, "time", e.target.value)}
                          placeholder="Time (e.g. 6:30 AM)"
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F6F4EF" }} />
                        <button onClick={() => removeBatch(idx)} className="p-1" style={{ color: "rgba(246,244,239,0.3)" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Levels */}
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Levels</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editing.levels.map((l, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.6)" }}>
                        {l}
                        <button onClick={() => removeLevel(i)} style={{ color: "rgba(246,244,239,0.3)" }}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={levelInput} onChange={e => setLevelInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLevel(); } }}
                      placeholder="Add level (e.g. Beginner)…"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F6F4EF" }} />
                    <motion.button onClick={addLevel} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74" }} whileHover={{ background: "rgba(122,140,116,0.3)" }}>
                      Add
                    </motion.button>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: "#7A8C74" }}>Features</label>
                  <div className="space-y-1.5 mb-2">
                    {editing.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <span className="flex-1 text-sm" style={{ color: "rgba(246,244,239,0.7)" }}>{f}</span>
                        <button onClick={() => removeFeature(i)} className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                      placeholder="Add feature…"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F6F4EF" }} />
                    <motion.button onClick={addFeature} className="px-4 py-2 rounded-lg text-sm" style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74" }} whileHover={{ background: "rgba(122,140,116,0.3)" }}>
                      Add
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm tracking-widest uppercase"
                  style={{ background: "#7A8C74", color: "#F6F4EF" }}
                  whileHover={{ background: "#6a7c64" }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </motion.button>
                <motion.button onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)" }}>
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
