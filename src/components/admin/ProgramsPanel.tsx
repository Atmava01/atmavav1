"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { getPrograms, upsertProgram, deleteProgram, getAllMentors } from "@/lib/firestore";
import type { Program, UserProfile } from "@/types";

function emptyProgram(): Program {
  return {
    id: "",
    title: "",
    duration: 30,
    description: "",
    price: 149,
    isActive: true,
    isFree: false,
    features: ["Live daily sessions", "Mon–Sat attendance", "Mentor guidance"],
    enrolledCount: 0,
    mentorId: null,
    mentorName: null,
    batches: [{ name: "Morning", time: "6:30 AM" }, { name: "Evening", time: "6:00 PM" }],
    levels: ["Beginner", "Intermediate", "Advanced"],
    badge: null,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#F6F4EF",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#7A8C74",
  marginBottom: "6px",
};

export function ProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors]   = useState<UserProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Program | null>(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [featInput, setFeatInput] = useState("");
  const [levelInput, setLevelInput] = useState("");

  useEffect(() => {
    Promise.all([getPrograms(), getAllMentors()])
      .then(([p, m]) => {
        setPrograms(p.sort((a, b) => Number(a.duration) - Number(b.duration)));
        setMentors(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setIsNew(true);
    setEditing(emptyProgram());
    setFeatInput(""); setLevelInput("");
  };

  const openEdit = (p: Program) => {
    setIsNew(false);
    setEditing({
      ...p,
      features: [...(p.features ?? [])],
      batches:  [...(p.batches  ?? [])],
      levels:   [...(p.levels   ?? [])],
    });
    setFeatInput(""); setLevelInput("");
  };

  const patch = (update: Partial<Program>) =>
    setEditing(prev => prev ? { ...prev, ...update } : prev);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.id.trim()) { alert("Program ID is required."); return; }
    setSaving(true);
    try {
      await upsertProgram(editing);
      setPrograms(prev =>
        isNew
          ? [...prev, editing].sort((a, b) => Number(a.duration) - Number(b.duration))
          : prev.map(p => p.id === editing.id ? editing : p)
      );
      setEditing(null);
    } catch (err) { console.error(err); alert("Save failed — check console."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProgram(toDelete);
      setPrograms(prev => prev.filter(p => p.id !== toDelete));
      setToDelete(null);
    } catch (err) { console.error(err); }
    setDeleting(false);
  };

  const toggleActive = async (p: Program) => {
    const updated = { ...p, isActive: !p.isActive };
    await upsertProgram(updated).catch(console.error);
    setPrograms(prev => prev.map(x => x.id === p.id ? updated : x));
  };

  const e = editing;

  return (
    <div style={{ color: "#F6F4EF", minHeight: "200px" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "2rem", fontWeight: 300,
          color: "#F6F4EF", margin: 0,
        }}>
          Programs
        </h2>

        {/* NEW PROGRAM BUTTON — always visible */}
        <button
          onClick={openCreate}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 18px", borderRadius: "12px", cursor: "pointer",
            background: "rgba(122,140,116,0.2)", color: "#7A8C74",
            border: "1px solid rgba(122,140,116,0.4)", fontSize: "13px",
            fontFamily: "inherit",
          }}
        >
          <Plus size={14} />
          New Program
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <p style={{ color: "rgba(246,244,239,0.4)", textAlign: "center", padding: "48px 0" }}>Loading…</p>
      ) : programs.length === 0 ? (
        <p style={{ color: "rgba(246,244,239,0.35)", textAlign: "center", padding: "48px 0", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
          No programs yet. Click &quot;New Program&quot; to create one.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {programs.map(p => (
            <div
              key={p.id}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "16px",
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                {/* Program info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 300 }}>
                      {p.title || `${p.duration}-Day Program`}
                    </span>
                    <span style={{
                      fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                      background: p.isActive ? "rgba(122,140,116,0.15)" : "rgba(255,255,255,0.05)",
                      color: p.isActive ? "#7A8C74" : "rgba(246,244,239,0.3)",
                      border: `1px solid ${p.isActive ? "rgba(122,140,116,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                    {p.badge && (
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "20px",
                        background: p.badge === "most-popular" ? "rgba(92,107,87,0.3)" : "rgba(92,107,87,0.12)",
                        color: "#7A8C74",
                        border: "1px solid rgba(122,140,116,0.35)",
                      }}>
                        {p.badge === "most-popular" ? "Most Popular" : "Best Value"}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: "13px", color: "rgba(246,244,239,0.45)", margin: "0 0 8px" }}>{p.description}</p>
                  )}
                  <div style={{ fontSize: "12px", color: "rgba(246,244,239,0.35)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    <span>{p.duration} days</span>
                    <span>₹{p.price.toLocaleString("en-IN")}</span>
                    <span>{p.enrolledCount ?? 0} enrolled</span>
                    {p.mentorName && <span>Mentor: {p.mentorName}</span>}
                  </div>
                </div>

                {/* Action buttons — TRASH is here */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
                  <button
                    onClick={() => toggleActive(p)}
                    title={p.isActive ? "Deactivate" : "Activate"}
                    style={{
                      padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(246,244,239,0.5)", display: "flex", alignItems: "center",
                    }}
                  >
                    {p.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  </button>

                  <button
                    onClick={() => openEdit(p)}
                    title="Edit"
                    style={{
                      padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
                      background: "rgba(122,140,116,0.15)", border: "1px solid rgba(122,140,116,0.3)",
                      color: "#7A8C74", display: "flex", alignItems: "center",
                    }}
                  >
                    <Pencil size={14} />
                  </button>

                  {/* TRASH BUTTON */}
                  <button
                    onClick={() => setToDelete(p.id)}
                    title="Delete program"
                    style={{
                      padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
                      background: "rgba(220,60,60,0.12)", border: "1px solid rgba(220,60,60,0.3)",
                      color: "rgba(220,60,60,0.85)", display: "flex", alignItems: "center",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirmation overlay ── */}
      {toDelete && (
        <div
          onClick={ev => { if (ev.target === ev.currentTarget) setToDelete(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          }}
        >
          <div style={{
            background: "#1E1D1B", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "360px",
          }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, marginTop: 0, marginBottom: "10px", color: "#F6F4EF" }}>
              Delete Program?
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(246,244,239,0.5)", marginBottom: "24px", lineHeight: 1.6 }}>
              This will permanently remove the program. Existing enrollments are unaffected.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "11px", borderRadius: "12px", cursor: "pointer",
                  background: "rgba(220,60,60,0.85)", color: "#fff", border: "none", fontSize: "13px",
                }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setToDelete(null)}
                style={{
                  padding: "11px 20px", borderRadius: "12px", cursor: "pointer",
                  background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.5)", border: "none", fontSize: "13px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit overlay ── */}
      {e && (
        <div
          onClick={ev => { if (ev.target === ev.currentTarget) setEditing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "32px 16px", overflowY: "auto",
          }}
        >
          <div style={{
            background: "#1E1D1B", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px",
            marginBottom: "32px",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 300, margin: 0, color: "#F6F4EF" }}>
                {isNew ? "New Program" : `Edit — ${e.title || e.id}`}
              </h3>
              <button
                onClick={() => setEditing(null)}
                style={{ background: "none", border: "none", color: "rgba(246,244,239,0.4)", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}
              >✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* ID */}
              <div>
                <label style={labelStyle}>Program ID</label>
                {isNew
                  ? <input value={e.id} onChange={ev => patch({ id: ev.target.value.trim() })} placeholder='e.g. "30"' style={inputStyle} />
                  : <div style={{ ...inputStyle, color: "rgba(246,244,239,0.35)", background: "rgba(255,255,255,0.02)" }}>{e.id}</div>
                }
              </div>

              {/* Title */}
              <div>
                <label style={labelStyle}>Title</label>
                <input value={e.title} onChange={ev => patch({ title: ev.target.value })} style={inputStyle} />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={e.description} onChange={ev => patch({ description: ev.target.value })}
                  rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>

              {/* Price / Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Price (₹)</label>
                  <input type="number" value={e.price}
                    onChange={ev => patch({ price: Number(ev.target.value) })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Duration (days)</label>
                  <input type="number" value={e.duration}
                    onChange={ev => patch({ duration: Number(ev.target.value) })} style={inputStyle} />
                </div>
              </div>

              {/* Active / Free */}
              <div style={{ display: "flex", gap: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(246,244,239,0.7)" }}>
                  <input type="checkbox" checked={e.isActive} onChange={ev => patch({ isActive: ev.target.checked })} />
                  Active
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "rgba(246,244,239,0.7)" }}>
                  <input type="checkbox" checked={e.isFree} onChange={ev => patch({ isFree: ev.target.checked })} />
                  Free
                </label>
              </div>

              {/* Badge */}
              <div>
                <label style={labelStyle}>Badge</label>
                <select
                  value={e.badge ?? ""}
                  onChange={ev => patch({ badge: (ev.target.value as "most-popular" | "best-value") || null })}
                  style={{ ...inputStyle, background: "rgba(30,28,26,0.95)" }}
                >
                  <option value="">— None —</option>
                  <option value="most-popular">Most Popular</option>
                  <option value="best-value">Best Value</option>
                </select>
              </div>

              {/* Mentor */}
              <div>
                <label style={labelStyle}>Assign Mentor</label>
                <select
                  value={e.mentorId ?? ""}
                  onChange={ev => {
                    const m = mentors.find(m => m.uid === ev.target.value);
                    patch({ mentorId: ev.target.value || null, mentorName: m?.name ?? null });
                  }}
                  style={{ ...inputStyle, background: "rgba(30,28,26,0.95)" }}
                >
                  <option value="">— Unassigned —</option>
                  {mentors.map(m => <option key={m.uid} value={m.uid}>{m.name} ({m.email})</option>)}
                </select>
              </div>

              {/* Batches */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Batches</label>
                  <button
                    onClick={() => patch({ batches: [...e.batches, { name: "", time: "" }] })}
                    style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "none", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={10} /> Add Batch
                  </button>
                </div>
                {e.batches.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                    <input value={b.name}
                      onChange={ev => { const bs = e.batches.map((x, j) => j === i ? { ...x, name: ev.target.value } : x); patch({ batches: bs }); }}
                      placeholder="Name (e.g. Morning)" style={{ ...inputStyle, flex: 1 }} />
                    <input value={b.time}
                      onChange={ev => { const bs = e.batches.map((x, j) => j === i ? { ...x, time: ev.target.value } : x); patch({ batches: bs }); }}
                      placeholder="Time (e.g. 6:30 AM)" style={{ ...inputStyle, flex: 1 }} />
                    <button
                      onClick={() => patch({ batches: e.batches.filter((_, j) => j !== i) })}
                      style={{ background: "none", border: "none", color: "rgba(246,244,239,0.35)", cursor: "pointer", padding: "4px" }}
                    ><X size={13} /></button>
                  </div>
                ))}
              </div>

              {/* Levels */}
              <div>
                <label style={labelStyle}>Levels</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {e.levels.map((l, i) => (
                    <span key={i} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.6)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      {l}
                      <button
                        onClick={() => patch({ levels: e.levels.filter((_, j) => j !== i) })}
                        style={{ background: "none", border: "none", color: "rgba(246,244,239,0.3)", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex" }}
                      ><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={levelInput} onChange={ev => setLevelInput(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === "Enter" && levelInput.trim()) { ev.preventDefault(); patch({ levels: [...e.levels, levelInput.trim()] }); setLevelInput(""); } }}
                    placeholder="Add level…" style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => { if (levelInput.trim()) { patch({ levels: [...e.levels, levelInput.trim()] }); setLevelInput(""); } }}
                    style={{ padding: "9px 14px", borderRadius: "10px", cursor: "pointer", background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "none", fontSize: "13px", whiteSpace: "nowrap" }}
                  >Add</button>
                </div>
              </div>

              {/* Features */}
              <div>
                <label style={labelStyle}>Features</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                  {e.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }}>
                      <span style={{ flex: 1, fontSize: "13px", color: "rgba(246,244,239,0.7)" }}>{f}</span>
                      <button
                        onClick={() => patch({ features: e.features.filter((_, j) => j !== i) })}
                        style={{ background: "none", border: "none", color: "rgba(246,244,239,0.3)", cursor: "pointer", padding: 0, fontSize: "14px" }}
                      >✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input value={featInput} onChange={ev => setFeatInput(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === "Enter" && featInput.trim()) { ev.preventDefault(); patch({ features: [...e.features, featInput.trim()] }); setFeatInput(""); } }}
                    placeholder="Add feature…" style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => { if (featInput.trim()) { patch({ features: [...e.features, featInput.trim()] }); setFeatInput(""); } }}
                    style={{ padding: "9px 14px", borderRadius: "10px", cursor: "pointer", background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "none", fontSize: "13px", whiteSpace: "nowrap" }}
                  >Add</button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: "13px", borderRadius: "12px",
                  cursor: saving ? "not-allowed" : "pointer",
                  background: "#7A8C74", color: "#F6F4EF", border: "none",
                  fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : isNew ? "Create Program" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: "13px 22px", borderRadius: "12px", cursor: "pointer",
                  background: "rgba(255,255,255,0.06)", color: "rgba(246,244,239,0.5)",
                  border: "none", fontSize: "13px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
