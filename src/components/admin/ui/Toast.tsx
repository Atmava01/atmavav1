"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `t-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = {
    success: <CheckCircle2 size={14} />,
    error:   <AlertCircle  size={14} />,
    info:    <Info         size={14} />,
  };

  const colors = {
    success: { bg: "rgba(92,107,87,0.18)",  border: "rgba(92,107,87,0.4)",  text: "#8FA888" },
    error:   { bg: "rgba(192,64,64,0.15)",  border: "rgba(192,64,64,0.35)", text: "#D47070" },
    info:    { bg: "rgba(100,130,180,0.12)", border: "rgba(100,130,180,0.3)", text: "#7A9FCC" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const c = colors[t.type];
            return (
              <motion.div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  backdropFilter: "blur(12px)",
                  minWidth: "280px",
                  maxWidth: "360px",
                }}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 8,  scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <span style={{ color: c.text, flexShrink: 0 }}>{icons[t.type]}</span>
                <p className="text-sm flex-1" style={{ color: "#F6F4EF", lineHeight: 1.4 }}>{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: "#F6F4EF" }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
