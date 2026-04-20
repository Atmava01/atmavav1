"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BarChart2, Users, BookOpen, CreditCard, ClipboardList, Video, UserCheck, Layout, ArrowRight } from "lucide-react";

const NAV_ITEMS = [
  { icon: BarChart2,    label: "Overview",    id: "overview",    desc: "Dashboard & analytics" },
  { icon: Users,        label: "Users",       id: "users",       desc: "Manage all users & roles" },
  { icon: BookOpen,     label: "Programs",    id: "programs",    desc: "Create & edit programs" },
  { icon: CreditCard,   label: "Payments",    id: "payments",    desc: "Revenue & payment history" },
  { icon: ClipboardList,label: "Enrollments", id: "enrollments", desc: "Grant & manage access" },
  { icon: Video,        label: "Sessions",    id: "sessions",    desc: "Live & upcoming sessions" },
  { icon: UserCheck,    label: "Mentors",     id: "mentors",     desc: "Mentor management" },
  { icon: Layout,       label: "Landing Page",id: "landing",     desc: "Edit public page content" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function CommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = NAV_ITEMS.filter(
    n =>
      n.label.toLowerCase().includes(query.toLowerCase()) ||
      n.desc.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) {
        onNavigate(filtered[selected].id);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                background: "#1C1B19",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              }}
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1,    y: 0    }}
              exit={{    opacity: 0, scale: 0.97, y: -8   }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Search size={15} style={{ color: "rgba(246,244,239,0.4)", flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Navigate to…"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: "#F6F4EF" }}
                />
                <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(246,244,239,0.35)", fontFamily: "monospace" }}>
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="py-2 max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "rgba(246,244,239,0.3)" }}>No results</p>
                ) : (
                  filtered.map((item, i) => {
                    const Icon = item.icon;
                    const isSelected = i === selected;
                    return (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                        style={{ background: isSelected ? "rgba(122,140,116,0.15)" : "transparent" }}
                        onMouseEnter={() => setSelected(i)}
                        onClick={() => { onNavigate(item.id); onClose(); }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: isSelected ? "rgba(122,140,116,0.25)" : "rgba(255,255,255,0.06)" }}
                        >
                          <Icon size={13} style={{ color: isSelected ? "#8FA888" : "rgba(246,244,239,0.45)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: isSelected ? "#F6F4EF" : "rgba(246,244,239,0.75)" }}>{item.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.35)" }}>{item.desc}</p>
                        </div>
                        {isSelected && <ArrowRight size={13} style={{ color: "#7A8C74", flexShrink: 0 }} />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2.5 flex items-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {[["↑↓", "navigate"], ["↵", "select"], ["esc", "close"]].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(246,244,239,0.4)", fontFamily: "monospace" }}>{key}</kbd>
                    <span className="text-xs" style={{ color: "rgba(246,244,239,0.3)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
