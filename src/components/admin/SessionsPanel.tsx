"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Video, RefreshCw, Clock, ChevronDown, Search, Radio } from "lucide-react";
import { getPrograms, getSessionsForProgram } from "@/lib/firestore";
import { SkeletonTable } from "@/components/admin/ui/Skeleton";
import { TopBar } from "@/components/admin/ui/TopBar";
import type { Program, Session } from "@/types";

function fmt12(t: string) {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function isLiveNow(s: Session): boolean {
  const today = new Date().toISOString().split("T")[0];
  if (s.date !== today) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  const [eh, em] = s.endTime.split(":").map(Number);
  return nowMins >= sh * 60 + sm && nowMins <= eh * 60 + em;
}

type ViewFilter = "all" | "upcoming" | "past" | "live";

export function SessionsPanel() {
  const [programs, setPrograms]         = useState<Program[]>([]);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [selectedProg, setSelectedProg] = useState<string>("");
  const [batchFilter, setBatchFilter]   = useState("all");
  const [viewFilter, setViewFilter]     = useState<ViewFilter>("all");
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [sessLoading, setSessLoading]   = useState(false);

  useEffect(() => {
    getPrograms()
      .then(p => {
        setPrograms(p);
        if (p.length > 0) setSelectedProg(p[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProg) return;
    setSessLoading(true);
    getSessionsForProgram(selectedProg)
      .then(s => { setSessions(s); setSessLoading(false); })
      .catch(() => setSessLoading(false));
  }, [selectedProg]);

  const today = new Date().toISOString().split("T")[0];

  const batches = useMemo(() => {
    const set = new Set(sessions.map(s => s.batch).filter(Boolean));
    return Array.from(set);
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (batchFilter !== "all") list = list.filter(s => s.batch === batchFilter);
    if (viewFilter === "upcoming") list = list.filter(s => s.date >= today && !isLiveNow(s));
    if (viewFilter === "past")     list = list.filter(s => s.date < today);
    if (viewFilter === "live")     list = list.filter(s => isLiveNow(s));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.mentorName?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, batchFilter, viewFilter, search, today]);

  const upcoming = sessions.filter(s => s.date >= today).length;
  const live     = sessions.filter(s => isLiveNow(s)).length;

  const refresh = () => {
    if (!selectedProg) return;
    setSessLoading(true);
    getSessionsForProgram(selectedProg)
      .then(s => { setSessions(s); setSessLoading(false); })
      .catch(() => setSessLoading(false));
  };

  // Group sessions by date
  const grouped = useMemo(() => {
    const map = new Map<string, Session[]>();
    filtered.forEach(s => {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    });
    return map;
  }, [filtered]);

  const VIEW_FILTERS: { id: ViewFilter; label: string }[] = [
    { id: "all",      label: "All" },
    { id: "live",     label: `Live (${live})` },
    { id: "upcoming", label: `Upcoming (${upcoming})` },
    { id: "past",     label: "Past" },
  ];

  return (
    <div className="flex flex-col min-h-screen adm-bg">
      <TopBar
        title="Sessions"
        subtitle={`${upcoming} upcoming · ${live > 0 ? `${live} live now` : "none live"}`}
        onOpenPalette={() => {}}
        actions={
          <button onClick={refresh} className="p-2 rounded-lg transition-all" style={{ color: "var(--adm-text-2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--adm-border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <RefreshCw size={14} />
          </button>
        }
      />

      <div className="px-6 md:px-10 py-6 space-y-5 max-w-5xl">

        {/* Controls */}
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Program selector */}
            <select
              value={selectedProg}
              onChange={e => setSelectedProg(e.target.value)}
              className="admin-select px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)", maxWidth: "240px" }}
            >
              {programs.map(p => (
                <option key={p.id} value={p.id} style={{ background: "#1C1B19" }}>
                  {p.id}-Day — {p.title}
                </option>
              ))}
            </select>

            {/* Batch filter */}
            {batches.length > 0 && (
              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="admin-select px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
              >
                <option value="all">All Batches</option>
                {batches.map(b => <option key={b} value={b} style={{ background: "#1C1B19" }}>{b}</option>)}
              </select>
            )}

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-text-3)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sessions…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--adm-input)", border: "1px solid var(--adm-input-border)", color: "var(--adm-text)" }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        {!loading && !sessLoading && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total",    value: sessions.length },
              { label: "Live",     value: live,            highlight: live > 0 },
              { label: "Upcoming", value: upcoming         },
              { label: "Past",     value: sessions.length - upcoming },
            ].map(s => (
              <div
                key={s.label}
                className="p-3.5 rounded-xl text-center"
                style={{ background: s.highlight ? "rgba(92,107,87,0.12)" : "var(--adm-card)", border: `1px solid ${s.highlight ? "rgba(92,107,87,0.3)" : "var(--adm-border)"}` }}
              >
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", color: s.highlight ? "#8FA888" : "#F6F4EF", fontWeight: 300 }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--adm-text-3)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* View filter pills */}
        {!loading && (
          <div className="flex gap-2 flex-wrap">
            {VIEW_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setViewFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: viewFilter === f.id ? "rgba(122,140,116,0.2)"  : "var(--adm-elevated)",
                  color:      viewFilter === f.id ? "#8FA888"                : "rgba(246,244,239,0.4)",
                  border: `1px solid ${viewFilter === f.id ? "rgba(122,140,116,0.4)" : "var(--adm-border)"}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Sessions */}
        {loading || sessLoading ? (
          <SkeletonTable rows={5} />
        ) : grouped.size === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--adm-elevated)", border: "1px solid var(--adm-border)" }}>
              <Calendar size={20} style={{ color: "var(--adm-text-4)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--adm-text-3)" }}>No sessions found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([date, dateSessions]) => {
              const dateObj = new Date(date + "T12:00:00");
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="px-3 py-1 rounded-lg text-xs"
                      style={{
                        background: isToday ? "rgba(122,140,116,0.18)" : "var(--adm-input)",
                        color: isToday ? "#8FA888" : "rgba(246,244,239,0.45)",
                        border: `1px solid ${isToday ? "rgba(122,140,116,0.3)" : "var(--adm-border)"}`,
                      }}
                    >
                      {isToday ? "Today" : dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div className="flex-1 h-px" style={{ background: "var(--adm-elevated)" }} />
                  </div>

                  {/* Session cards */}
                  <div className="space-y-2">
                    {dateSessions.map((s, i) => {
                      const live = isLiveNow(s);
                      return (
                        <motion.div
                          key={s.id}
                          className="p-4 rounded-xl flex items-center gap-4"
                          style={{
                            background: live ? "rgba(92,107,87,0.1)" : isFuture ? "var(--adm-card)" : "rgba(255,255,255,0.025)",
                            border: `1px solid ${live ? "rgba(92,107,87,0.35)" : isFuture ? "var(--adm-input-border)" : "var(--adm-input)"}`,
                            opacity: !isFuture && !live ? 0.7 : 1,
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: !isFuture && !live ? 0.7 : 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          {/* Icon */}
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: live ? "rgba(92,107,87,0.2)" : isFuture ? "var(--adm-input)" : "transparent" }}>
                            {live ? <Radio size={14} style={{ color: "#8FA888" }} /> : <Calendar size={14} style={{ color: isFuture ? "#7A8C74" : "rgba(246,244,239,0.25)" }} />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm" style={{ color: "var(--adm-text)" }}>{s.title}</span>
                              {live && (
                                <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(92,107,87,0.2)", color: "#8FA888", border: "1px solid rgba(92,107,87,0.4)" }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                  Live
                                </span>
                              )}
                              {s.batch && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.12)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.2)" }}>
                                  {s.batch}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--adm-text-3)" }}>
                              <span className="flex items-center gap-1"><Clock size={10} />{fmt12(s.startTime)} – {fmt12(s.endTime)}</span>
                              <span>by {s.mentorName}</span>
                            </div>
                          </div>

                          {/* Join */}
                          {s.meetLink && (isFuture || live) && (
                            <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                              <motion.button
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                                style={{ background: live ? "rgba(92,107,87,0.25)" : "rgba(122,140,116,0.12)", color: "#8FA888", border: "1px solid rgba(122,140,116,0.3)" }}
                                whileHover={{ background: "rgba(92,107,87,0.3)" }}
                                whileTap={{ scale: 0.96 }}
                              >
                                <Video size={11} /> {live ? "Join Live" : "Join"}
                              </motion.button>
                            </a>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
