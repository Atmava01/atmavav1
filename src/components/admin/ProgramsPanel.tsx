"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { getPrograms, upsertProgram, deleteProgram, getAllMentors } from "@/lib/firestore";
import { TopBar } from "@/components/admin/ui/TopBar";
import { SkeletonTable } from "@/components/admin/ui/Skeleton";
import { useToast } from "@/components/admin/ui/Toast";
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
  background: "var(--adm-input)",
  border: "1px solid var(--adm-input-border)",
  color: "var(--adm-text)",
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
  const { toast } = useToast();

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
      toast(isNew ? "Program created" : "Program saved");
    } catch (err) { console.error(err); toast("Save failed", "error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProgram(toDelete);
      setPrograms(prev => prev.filter(p => p.id !== toDelete));
      setToDelete(null);
      toast("Program deleted");
    } catch (err) { console.error(err); toast("Delete failed", "error"); }
    setDeleting(false);
  };

  const toggleActive = async (p: Program) => {
    const updated = { ...p, isActive: !p.isActive };
    await upsertProgram(updated).catch(console.error);
    setPrograms(prev => prev.map(x => x.id === p.id ? updated : x));
    toast(updated.isActive ? "Program activated" : "Program deactivated");
  };

  const e = editing;

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Programs"
        subtitle={`${programs.length} programs`}
        onOpenPalette={() => {}}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(122,140,116,0.2)", color: "#8FA888", border: "1px solid rgba(122,140,116,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(122,140,116,0.3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(122,140,116,0.2)")}
          >
            <Plus size={12} /> New Program
          </button>
        }
      />

      <div className="px-6 md:px-10 py-6 space-y-4 max-w-5xl">

        {loading ? (
          <SkeletonTable rows={3} />
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <p className="text-sm" style={{ color: "var(--adm-text-3)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
              No programs yet. Click &quot;New Program&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {programs.map(p => (
              <div
                key={p.id}
                className="rounded-2xl p-5"
                style={{ background: "var(--adm-card)", border: "1px solid var(--adm-border)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Program info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 300, color: "var(--adm-text)" }}>
                        {p.title || `${p.duration}-Day Program`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: p.isActive ? "rgba(122,140,116,0.15)" : "var(--adm-elevated)",
                        color: p.isActive ? "#7A8C74" : "var(--adm-text-4)",
                        border: `1px solid ${p.isActive ? "rgba(122,140,116,0.3)" : "var(--adm-border)"}`,
                      }}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                      {p.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: p.badge === "most-popular" ? "rgba(92,107,87,0.3)" : "rgba(92,107,87,0.12)",
                          color: "#7A8C74",
                          border: "1px solid rgba(122,140,116,0.35)",
                        }}>
                          {p.badge === "most-popular" ? "Most Popular" : "Best Value"}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs mb-2" style={{ color: "var(--adm-text-3)" }}>{p.description}</p>
                    )}
                    <div className="flex gap-5 text-xs flex-wrap" style={{ color: "var(--adm-text-4)" }}>
                      <span>{p.duration} days</span>
                      <span>₹{p.price.toLocaleString("en-IN")}</span>
                      <span>{p.enrolledCount ?? 0} enrolled</span>
                      {p.mentorName && <span>Mentor: {p.mentorName}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    <button
                      onClick={() => toggleActive(p)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                      className="p-2 rounded-lg flex items-center transition-all"
                      style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)", color: "var(--adm-text-3)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-input)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "var(--adm-elevated)")}
                    >
                      {p.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>

                    <button
                      onClick={() => openEdit(p)}
                      title="Edit"
                      className="p-2 rounded-lg flex items-center transition-all"
                      style={{ background: "rgba(122,140,116,0.15)", border: "1px solid rgba(122,140,116,0.3)", color: "#7A8C74" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(122,140,116,0.25)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(122,140,116,0.15)")}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => setToDelete(p.id)}
                      title="Delete"
                      className="p-2 rounded-lg flex items-center transition-all"
                      style={{ background: "rgba(220,60,60,0.12)", border: "1px solid rgba(220,60,60,0.3)", color: "rgba(220,60,60,0.85)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,60,60,0.2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(220,60,60,0.12)")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            background: "var(--adm-surface)", border: "1px solid var(--adm-border)",
            borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "360px",
          }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, marginTop: 0, marginBottom: "10px", color: "var(--adm-text)" }}>
              Delete Program?
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--adm-text-3)", lineHeight: 1.6 }}>
              This will permanently remove the program. Existing enrollments are unaffected.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(220,60,60,0.85)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setToDelete(null)}
                className="px-5 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--adm-elevated)", color: "var(--adm-text-3)", border: "none", cursor: "pointer" }}
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
            background: "var(--adm-surface)", border: "1px solid var(--adm-border)",
            borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px",
            marginBottom: "32px",
          }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 300, margin: 0, color: "var(--adm-text)" }}>
                {isNew ? "New Program" : `Edit — ${e.title || e.id}`}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg"
                style={{ background: "none", border: "none", color: "var(--adm-text-4)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}
              >✕</button>
            </div>

            <div className="flex flex-col gap-4">

              {/* ID */}
              <div>
                <label style={labelStyle}>Program ID</label>
                {isNew
                  ? <input value={e.id} onChange={ev => patch({ id: ev.target.value.trim() })} placeholder='e.g. "30"' style={inputStyle} />
                  : <div style={{ ...inputStyle, color: "var(--adm-text-4)", background: "var(--adm-elevated)" }}>{e.id}</div>
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--adm-text-2)" }}>
                  <input type="checkbox" checked={e.isActive} onChange={ev => patch({ isActive: ev.target.checked })} />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--adm-text-2)" }}>
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
                  style={{ ...inputStyle }}
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
                  style={{ ...inputStyle }}
                >
                  <option value="">— Unassigned —</option>
                  {mentors.map(m => <option key={m.uid} value={m.uid}>{m.name} ({m.email})</option>)}
                </select>
              </div>

              {/* Batches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ ...labelStyle, margin: 0 }}>Batches</label>
                  <button
                    onClick={() => patch({ batches: [...e.batches, { name: "", time: "" }] })}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "none", cursor: "pointer" }}
                  >
                    <Plus size={10} /> Add Batch
                  </button>
                </div>
                {e.batches.map((b, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input value={b.name}
                      onChange={ev => { const bs = e.batches.map((x, j) => j === i ? { ...x, name: ev.target.value } : x); patch({ batches: bs }); }}
                      placeholder="Name (e.g. Morning)" style={{ ...inputStyle, flex: 1 }} />
                    <input value={b.time}
                      onChange={ev => { const bs = e.batches.map((x, j) => j === i ? { ...x, time: ev.target.value } : x); patch({ batches: bs }); }}
                      placeholder="Time (e.g. 6:30 AM)" style={{ ...inputStyle, flex: 1 }} />
                    <button
                      onClick={() => patch({ batches: e.batches.filter((_, j) => j !== i) })}
                      style={{ background: "none", border: "none", color: "var(--adm-text-4)", cursor: "pointer", padding: "4px" }}
                    ><X size={13} /></button>
                  </div>
                ))}
              </div>

              {/* Levels */}
              <div>
                <label style={labelStyle}>Levels</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {e.levels.map((l, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ background: "var(--adm-elevated)", color: "var(--adm-text-2)", border: "1px solid var(--adm-border)" }}>
                      {l}
                      <button
                        onClick={() => patch({ levels: e.levels.filter((_, j) => j !== i) })}
                        style={{ background: "none", border: "none", color: "var(--adm-text-4)", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex" }}
                      ><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={levelInput} onChange={ev => setLevelInput(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === "Enter" && levelInput.trim()) { ev.preventDefault(); patch({ levels: [...e.levels, levelInput.trim()] }); setLevelInput(""); } }}
                    placeholder="Add level…" style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => { if (levelInput.trim()) { patch({ levels: [...e.levels, levelInput.trim()] }); setLevelInput(""); } }}
                    className="px-3 py-2 rounded-xl text-xs whitespace-nowrap"
                    style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "none", cursor: "pointer" }}
                  >Add</button>
                </div>
              </div>

              {/* Features */}
              <div>
                <label style={labelStyle}>Features</label>
                <div className="flex flex-col gap-1.5 mb-2">
                  {e.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "var(--adm-elevated)" }}>
                      <span className="flex-1 text-sm" style={{ color: "var(--adm-text-2)" }}>{f}</span>
                      <button
                        onClick={() => patch({ features: e.features.filter((_, j) => j !== i) })}
                        style={{ background: "none", border: "none", color: "var(--adm-text-4)", cursor: "pointer", padding: 0, fontSize: "14px" }}
                      >✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={featInput} onChange={ev => setFeatInput(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === "Enter" && featInput.trim()) { ev.preventDefault(); patch({ features: [...e.features, featInput.trim()] }); setFeatInput(""); } }}
                    placeholder="Add feature…" style={{ ...inputStyle, flex: 1 }} />
                  <button
                    onClick={() => { if (featInput.trim()) { patch({ features: [...e.features, featInput.trim()] }); setFeatInput(""); } }}
                    className="px-3 py-2 rounded-xl text-xs whitespace-nowrap"
                    style={{ background: "rgba(122,140,116,0.2)", color: "#7A8C74", border: "none", cursor: "pointer" }}
                  >Add</button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-xs uppercase tracking-widest"
                style={{
                  background: "#7A8C74", color: "#F6F4EF", border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : isNew ? "Create Program" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-5 py-3 rounded-xl text-sm"
                style={{ background: "var(--adm-elevated)", color: "var(--adm-text-3)", border: "none", cursor: "pointer" }}
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
