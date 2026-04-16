"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Headphones, Video, BookOpen, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getResources } from "@/lib/firestore";
import type { Resource } from "@/types";

const typeColors: Record<string, string> = { PDF: "#5C6B57", Audio: "#7A8C74", Video: "#2C2B29" };
const typeIcons: Record<string, React.ComponentType<{ size: number; style?: React.CSSProperties }>> = {
  PDF: FileText, Audio: Headphones, Video: Video,
};

const DEFAULT_RESOURCES: Resource[] = [
  { id: "1", title: "Foundation Guide", description: "Core practice framework", type: "PDF", url: "#", programId: "30", size: "2.4 MB", addedAt: "2025-01-01" },
  { id: "2", title: "Morning Stillness", description: "Guided morning practice", type: "Audio", url: "#", programId: "30", size: "31 MB", addedAt: "2025-01-01" },
  { id: "3", title: "Breath Fundamentals", description: "Video masterclass", type: "Video", url: "#", programId: "30", size: "410 MB", addedAt: "2025-01-01" },
  { id: "4", title: "Journal Template", description: "Daily reflection prompts", type: "PDF", url: "#", programId: "30", size: "0.9 MB", addedAt: "2025-01-01" },
  { id: "5", title: "Evening Release", description: "Guided relaxation audio", type: "Audio", url: "#", programId: "30", size: "25 MB", addedAt: "2025-01-01" },
  { id: "6", title: "Integration Week 2", description: "Deep dive video session", type: "Video", url: "#", programId: "60", size: "340 MB", addedAt: "2025-01-01" },
];

export function Resources() {
  const { userProfile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResources(userProfile?.programId ?? undefined)
      .then(r => {
        setResources(r.length > 0 ? r : DEFAULT_RESOURCES);
        setLoading(false);
      })
      .catch(() => { setResources(DEFAULT_RESOURCES); setLoading(false); });
  }, [userProfile?.programId]);

  return (
    <div className="space-y-6">
      <motion.h2 className="text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontWeight: 400 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        Resources
      </motion.h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "#5C6B57" }} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {resources.map((res, i) => {
            const Icon = typeIcons[res.type] ?? BookOpen;
            return (
              <motion.div key={res.id} className="group relative p-5 rounded-2xl overflow-hidden" style={{ background: "#F6F4EF", border: "1px solid #D4CCBF" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.07 }} whileHover={{ borderColor: "#5C6B57", y: -2 }}>
                <motion.div className="absolute inset-0 pointer-events-none rounded-2xl" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} style={{ background: "linear-gradient(135deg, rgba(92,107,87,0.04) 0%, transparent 60%)" }} />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${typeColors[res.type]}14`, border: `1px solid ${typeColors[res.type]}30` }}>
                    <Icon size={17} style={{ color: typeColors[res.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm mb-0.5" style={{ color: "#2C2B29" }}>{res.title}</p>
                    <p className="text-xs" style={{ color: "#4A4845" }}>{res.description} · {res.size}</p>
                  </div>
                  <motion.a
                    href={res.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 flex-shrink-0"
                    style={{ background: "#5C6B57", color: "#F6F4EF" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Open
                  </motion.a>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${typeColors[res.type]}14`, color: typeColors[res.type], border: `1px solid ${typeColors[res.type]}30` }}>
                  {res.type}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
