"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Video, RefreshCw } from "lucide-react";
import { getPrograms, getSessionsForProgram } from "@/lib/firestore";
import type { Program, Session } from "@/types";

export function SessionsPanel() {
  const [programs, setPrograms]         = useState<Program[]>([]);
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [selectedProg, setSelectedProg] = useState<string>("");
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

  const today    = new Date().toISOString().split("T")[0];
  const upcoming = sessions.filter(s => s.date >= today).length;

  const refresh = () => {
    if (!selectedProg) return;
    setSessLoading(true);
    getSessionsForProgram(selectedProg)
      .then(s => { setSessions(s); setSessLoading(false); })
      .catch(() => setSessLoading(false));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <motion.h2
          className="text-2xl"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF", fontWeight: 300 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Sessions
        </motion.h2>
        <motion.span className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {upcoming} upcoming
        </motion.span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
        </div>
      ) : (
        <>
          {/* Program selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedProg}
              onChange={e => setSelectedProg(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm outline-none flex-1 max-w-xs"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F6F4EF" }}
            >
              {programs.map(p => (
                <option key={p.id} value={p.id} style={{ background: "#2C2B29" }}>
                  {p.id}-Day — {p.title}
                </option>
              ))}
            </select>
            <motion.button onClick={refresh} whileHover={{ opacity: 0.7 }} whileTap={{ scale: 0.95 }}>
              <RefreshCw size={14} style={{ color: "rgba(246,244,239,0.4)" }} />
            </motion.button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total",    value: sessions.length },
              { label: "Upcoming", value: upcoming },
              { label: "Past",     value: sessions.length - upcoming },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="p-4 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "#F6F4EF", fontWeight: 300 }}>{s.value}</span>
                <p className="text-xs mt-0.5" style={{ color: "rgba(246,244,239,0.4)" }}>{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Sessions list */}
          {sessLoading ? (
            <div className="flex justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-6 h-6 rounded-full border-2 border-t-transparent" style={{ borderColor: "#7A8C74" }} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "rgba(246,244,239,0.4)" }}>No sessions for this program yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => {
                const isUpcoming = s.date >= today;
                return (
                  <motion.div
                    key={s.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${isUpcoming ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.07)"}`,
                      opacity: isUpcoming ? 1 : 0.65,
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: isUpcoming ? "rgba(122,140,116,0.15)" : "rgba(255,255,255,0.04)" }}
                      >
                        <Calendar size={14} style={{ color: isUpcoming ? "#7A8C74" : "rgba(246,244,239,0.3)" }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm" style={{ color: "#F6F4EF" }}>{s.title}</span>
                          {s.batch && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.25)" }}>
                              {s.batch}
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(122,140,116,0.08)", color: "#7A8C74" }}>upcoming</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "rgba(246,244,239,0.4)" }}>
                          <span>{s.date}</span>
                          <span>{s.startTime} – {s.endTime}</span>
                          <span>by {s.mentorName}</span>
                        </div>
                      </div>

                      {s.meetLink && isUpcoming && (
                        <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <motion.button
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: "rgba(122,140,116,0.15)", color: "#7A8C74", border: "1px solid rgba(122,140,116,0.3)" }}
                            whileHover={{ background: "rgba(122,140,116,0.25)" }}
                          >
                            <Video size={11} /> Join
                          </motion.button>
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
