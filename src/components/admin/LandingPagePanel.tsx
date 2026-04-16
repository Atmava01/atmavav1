"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Upload, ImageIcon } from "lucide-react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  getLandingTestimonials,
  upsertLandingTestimonial,
  addLandingTestimonial,
  deleteLandingTestimonial,
  getLandingMentors,
  upsertLandingMentor,
  addLandingMentor,
  deleteLandingMentor,
  seedLandingDefaults,
  type LandingTestimonial,
  type LandingMentor,
} from "@/lib/firestore";

async function uploadMentorPhoto(file: File, mentorId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `mentorPhotos/${mentorId}.${ext}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

const MAX_TESTIMONIALS = 3;

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(246,244,239,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#F6F4EF",
  fontSize: "0.875rem",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  color: "rgba(246,244,239,0.5)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

// ─── Testimonial form ─────────────────────────────────────────────────────────

const EMPTY_T: Omit<LandingTestimonial, "id"> = {
  quote: "",
  name: "",
  detail: "",
  initials: "",
};

function TestimonialForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: LandingTestimonial;
  onSave: (data: Omit<LandingTestimonial, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<LandingTestimonial, "id">>(
    initial
      ? { quote: initial.quote, name: initial.name, detail: initial.detail, initials: initial.initials }
      : EMPTY_T
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleNameChange = (v: string) => {
    const auto = v.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    const prevAuto = form.name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    setForm(prev => ({
      ...prev,
      name: v,
      initials: !prev.initials || prev.initials === prevAuto ? auto : prev.initials,
    }));
  };

  const valid = form.quote.trim() && form.name.trim() && form.detail.trim();

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ background: "rgba(246,244,239,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div>
        <label style={labelStyle}>Quote</label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={form.quote}
          onChange={e => set("quote", e.target.value)}
          placeholder="The testimonial text…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Priya S." />
        </div>
        <div>
          <label style={labelStyle}>Initials (auto)</label>
          <input style={inputStyle} value={form.initials} onChange={e => set("initials", e.target.value)} placeholder="PS" maxLength={2} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Detail</label>
        <input style={inputStyle} value={form.detail} onChange={e => set("detail", e.target.value)} placeholder="60-Day Program · Morning Batch" />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={!valid}
          onClick={() => onSave({ ...form, ...(initial ? { id: initial.id } : {}) })}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: valid ? "#5C6B57" : "rgba(92,107,87,0.3)",
            color: valid ? "#F6F4EF" : "rgba(246,244,239,0.4)",
            cursor: valid ? "pointer" : "not-allowed",
          }}
        >
          {initial ? "Save changes" : "Add testimonial"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: "rgba(246,244,239,0.06)", color: "rgba(246,244,239,0.6)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Testimonials tab ─────────────────────────────────────────────────────────

function TestimonialsTab() {
  const [items, setItems] = useState<LandingTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setItems(await getLandingTestimonials());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data: Omit<LandingTestimonial, "id"> & { id?: string }) => {
    await addLandingTestimonial(data as Omit<LandingTestimonial, "id">);
    setAdding(false);
    await load();
  };

  const handleEdit = async (data: Omit<LandingTestimonial, "id"> & { id?: string }) => {
    await upsertLandingTestimonial(data as LandingTestimonial);
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteLandingTestimonial(id);
    setDeletingId(null);
    await load();
  };

  const atMax = items.length >= MAX_TESTIMONIALS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "rgba(246,244,239,0.5)" }}>
          {items.length} / {MAX_TESTIMONIALS} testimonials
        </p>
        {!adding && !atMax && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
          >
            <Plus size={12} /> Add
          </button>
        )}
        {atMax && (
          <p className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>
            Max 6 reached — delete one to add another
          </p>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TestimonialForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(246,244,239,0.05)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center" style={{ color: "rgba(246,244,239,0.3)", fontSize: "0.875rem" }}>
          No testimonials yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div
              key={item.id}
              layout
              className="rounded-2xl"
              style={{ background: "rgba(246,244,239,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {editingId === item.id ? (
                <div className="p-4">
                  <TestimonialForm
                    initial={item}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="px-5 py-4 flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm italic mb-1" style={{ color: "rgba(246,244,239,0.7)", fontWeight: 300 }}>
                      "{item.quote}"
                    </p>
                    <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                      — {item.name} · {item.detail}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "rgba(246,244,239,0.4)" }}
                    >
                      <Pencil size={13} />
                    </button>
                    {deletingId === item.id ? (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: "rgba(220,38,38,0.2)", color: "#F87171" }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "rgba(246,244,239,0.4)" }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: "rgba(246,244,239,0.4)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mentor form ──────────────────────────────────────────────────────────────

const EMPTY_M: Omit<LandingMentor, "id"> = {
  name: "",
  paras: [""],
  photoURL: "",
};

function MentorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: LandingMentor;
  onSave: (data: Omit<LandingMentor, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<LandingMentor, "id">>(
    initial
      ? { name: initial.name, paras: [...initial.paras], photoURL: initial.photoURL ?? "" }
      : EMPTY_M
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initial?.photoURL ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setName = (v: string) => setForm(prev => ({ ...prev, name: v }));
  const setPara = (i: number, v: string) =>
    setForm(prev => { const p = [...prev.paras]; p[i] = v; return { ...prev, paras: p }; });
  const addPara = () => setForm(prev => ({ ...prev, paras: [...prev.paras, ""] }));
  const removePara = (i: number) =>
    setForm(prev => ({ ...prev, paras: prev.paras.filter((_, idx) => idx !== i) }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const valid = form.name.trim() && form.paras.some(p => p.trim());

  const handleSave = async () => {
    if (!valid) return;
    setUploading(true);
    try {
      let photoURL = form.photoURL ?? "";
      if (photoFile) {
        const tempId = initial?.id ?? `new_${Date.now()}`;
        photoURL = await uploadMentorPhoto(photoFile, tempId);
      }
      onSave({ ...form, photoURL, ...(initial ? { id: initial.id } : {}) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ background: "rgba(246,244,239,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Photo upload */}
      <div>
        <label style={labelStyle}>Photo</label>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: "rgba(246,244,239,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={20} style={{ color: "rgba(246,244,239,0.25)" }} />
            )}
          </div>
          {/* Upload button */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: "rgba(246,244,239,0.08)", color: "rgba(246,244,239,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Upload size={11} /> {photoPreview ? "Change photo" : "Upload photo"}
            </button>
            {photoPreview && (
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(""); setForm(prev => ({ ...prev, photoURL: "" })); }}
                className="flex items-center gap-1 text-xs px-2 py-1"
                style={{ color: "rgba(246,244,239,0.35)" }}
              >
                <X size={10} /> Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={form.name} onChange={e => setName(e.target.value)} placeholder="Mentor name" />
      </div>

      <div className="space-y-2">
        <label style={labelStyle}>Bio paragraphs</label>
        {form.paras.map((para, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              rows={3}
              style={{ ...inputStyle, flex: 1, resize: "vertical" }}
              value={para}
              onChange={e => setPara(i, e.target.value)}
              placeholder={`Paragraph ${i + 1}…`}
            />
            {form.paras.length > 1 && (
              <button
                onClick={() => removePara(i)}
                className="p-1.5 rounded-lg self-start mt-0.5"
                style={{ color: "rgba(246,244,239,0.4)", flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addPara}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(246,244,239,0.06)", color: "rgba(246,244,239,0.5)" }}
        >
          <Plus size={11} /> Add paragraph
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          disabled={!valid || uploading}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: valid && !uploading ? "#5C6B57" : "rgba(92,107,87,0.3)",
            color: valid && !uploading ? "#F6F4EF" : "rgba(246,244,239,0.4)",
            cursor: valid && !uploading ? "pointer" : "not-allowed",
          }}
        >
          {uploading ? "Uploading…" : initial ? "Save changes" : "Add mentor"}
        </button>
        <button
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ background: "rgba(246,244,239,0.06)", color: "rgba(246,244,239,0.6)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Mentors tab ──────────────────────────────────────────────────────────────

function MentorsTab() {
  const [items, setItems] = useState<LandingMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setItems(await getLandingMentors());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data: Omit<LandingMentor, "id"> & { id?: string }) => {
    await addLandingMentor(data as Omit<LandingMentor, "id">);
    setAdding(false);
    await load();
  };

  const handleEdit = async (data: Omit<LandingMentor, "id"> & { id?: string }) => {
    await upsertLandingMentor(data as LandingMentor);
    setEditingId(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteLandingMentor(id);
    setDeletingId(null);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "rgba(246,244,239,0.5)" }}>
          {items.length} mentor{items.length !== 1 ? "s" : ""} on the about page
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
            style={{ background: "#5C6B57", color: "#F6F4EF" }}
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <MentorForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(246,244,239,0.05)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center" style={{ color: "rgba(246,244,239,0.3)", fontSize: "0.875rem" }}>
          No mentors yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div
              key={item.id}
              layout
              className="rounded-2xl"
              style={{ background: "rgba(246,244,239,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {editingId === item.id ? (
                <div className="p-4">
                  <MentorForm
                    initial={item}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="px-5 py-4 flex gap-4 items-center">
                  {/* Photo thumbnail */}
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: "rgba(246,244,239,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {item.photoURL ? (
                      <img src={item.photoURL} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={14} style={{ color: "rgba(246,244,239,0.2)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-0.5" style={{ color: "#F6F4EF" }}>
                      {item.name}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                      {item.paras.length} paragraph{item.paras.length !== 1 ? "s" : ""}{item.photoURL ? "" : " · no photo"}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "rgba(246,244,239,0.4)" }}
                    >
                      <Pencil size={13} />
                    </button>
                    {deletingId === item.id ? (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: "rgba(220,38,38,0.2)", color: "#F87171" }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "rgba(246,244,239,0.4)" }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: "rgba(246,244,239,0.4)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type Tab = "testimonials" | "mentors";

export function LandingPagePanel() {
  const [tab, setTab] = useState<Tab>("testimonials");

  // Seed Firestore with defaults on first open if collections are empty
  useEffect(() => { seedLandingDefaults().catch(() => {}); }, []);

  const tabs: { id: Tab; label: string; sub: string }[] = [
    { id: "testimonials", label: "Testimonials", sub: '"What seekers are saying" — home page' },
    { id: "mentors",      label: "Mentors",      sub: '"Those who hold the space" — about page' },
  ];

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: "rgba(246,244,239,0.35)" }}>
          Admin
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
            fontWeight: 300,
            color: "#F6F4EF",
            lineHeight: 1.2,
          }}
        >
          Landing Page Settings
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>
          Manage testimonials and mentor profiles displayed on the public site.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: tab === t.id ? "rgba(92,107,87,0.25)" : "rgba(246,244,239,0.06)",
              color: tab === t.id ? "#F6F4EF" : "rgba(246,244,239,0.45)",
              border: tab === t.id ? "1px solid rgba(92,107,87,0.4)" : "1px solid transparent",
              fontWeight: tab === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs mb-5" style={{ color: "rgba(246,244,239,0.3)" }}>
        {tabs.find(t => t.id === tab)?.sub}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "testimonials" ? <TestimonialsTab /> : <MentorsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
