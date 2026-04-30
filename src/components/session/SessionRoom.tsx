"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Mic, MicOff, Video, VideoOff, Search, Send,
  ChevronRight, ChevronLeft, Hand, Check, X,
  Volume2, Shield, Crown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { buildJitsiRoomName } from "@/lib/sessionLinks";
import {
  sendChatMessage, subscribeToChatMessages, getStudentsForProgram,
  requestMicPermission, respondToMicRequest,
  subscribeMicRequests, subscribeMicStatus,
  joinSessionPresence, leaveSessionPresence,
  upsertAttendance,
} from "@/lib/firestore";
import type { Session } from "@/types";
import type { ChatMessage, MicRequest } from "@/lib/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsedSince(startTime: string, date: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const start = new Date(`${date}T${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}:00`);
  const sec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2,"0")}:${String(sec % 60).padStart(2,"0")}`;
}

function isSessionLive(s: Session): boolean {
  const today = new Date().toISOString().split("T")[0];
  if (s.date !== today) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const [sh, sm] = s.startTime.split(":").map(Number);
  const [eh, em] = s.endTime.split(":").map(Number);
  return now >= sh * 60 + sm && now <= eh * 60 + em;
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function msgTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const AVATAR_PALETTE = ["#5C6B57","#7A8C74","#8FA3B0","#B87333","#D4A847","#6E5B7A","#7A5B4E"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ─── Web Audio Ambience ────────────────────────────────────────────────────────

type AmbienceId = "ocean" | "forest" | "bowl" | "silence";

class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private nodes: (AudioNode & { stop?: () => void })[] = [];
  private master: GainNode | null = null;

  private ensureCtx() {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private brownNoise(ctx: AudioContext): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, 4 * ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = (last + 0.02 * w) / 1.02;
      last = d[i];
      d[i] *= 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  private pinkNoise(ctx: AudioContext): AudioBufferSourceNode {
    const buf = ctx.createBuffer(1, 4 * ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.115;
      b6 = w * 0.115926;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  play(id: AmbienceId) {
    this.stop();
    if (id === "silence") return;

    const ctx = this.ensureCtx();
    const dest = this.master!;

    if (id === "ocean") {
      const noise = this.brownNoise(ctx);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 400;
      // Wave rhythm LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      noise.connect(lp); lp.connect(dest);
      noise.start(); lfo.start();
      this.nodes = [noise, lfo];
    }

    if (id === "forest") {
      const noise = this.pinkNoise(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 1200;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 4000;
      const g = ctx.createGain(); g.gain.value = 0.6;
      noise.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
      noise.start();
      this.nodes = [noise];
    }

    if (id === "bowl") {
      // 432 Hz singing bowl with slow tremolo
      const freqs = [432, 864, 1296]; // fundamental + harmonics
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine"; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.3 : 0.3 / (i + 1);
        // Tremolo
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.15 + i * 0.05;
        const lfoG = ctx.createGain(); lfoG.gain.value = 0.05;
        lfo.connect(lfoG); lfoG.connect(g.gain);
        osc.connect(g); g.connect(dest);
        osc.start(); lfo.start();
        this.nodes.push(osc, lfo);
      });
    }
  }

  stop() {
    this.nodes.forEach(n => { try { (n as OscillatorNode).stop?.(); (n as AudioBufferSourceNode).stop?.(); } catch {} });
    this.nodes = [];
    if (this.master) { this.master.disconnect(); this.master = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }

  setVolume(v: number) {
    if (this.master) this.master.gain.value = v;
  }
}

// ─── Breathe Component ────────────────────────────────────────────────────────
// Cycle: Inhale 5s (5→1) · Hold 3s · Exhale 5s (5→1)

type BreathePhase = "inhale" | "hold" | "exhale";

const PHASE_CONFIG: Record<BreathePhase, { label: string; secs: number; color: string; glow: string; next: BreathePhase }> = {
  inhale: { label: "Inhale",  secs: 5, color: "#7A9C74", glow: "rgba(122,156,116,0.4)", next: "hold"   },
  hold:   { label: "Hold",    secs: 3, color: "#D4A847", glow: "rgba(212,168,71,0.35)",  next: "exhale" },
  exhale: { label: "Exhale",  secs: 5, color: "#8FA3B0", glow: "rgba(143,163,176,0.35)", next: "inhale" },
};

function BreatheRing() {
  const [phase, setPhase] = useState<BreathePhase>("inhale");
  const [count, setCount] = useState(5);

  useEffect(() => {
    const cfg = PHASE_CONFIG[phase];
    setCount(cfg.secs);

    const interval = setInterval(() => {
      setCount(c => (c <= 1 ? cfg.secs : c - 1));
    }, 1000);

    const advance = setTimeout(() => {
      setPhase(cfg.next);
    }, cfg.secs * 1000);

    return () => { clearInterval(interval); clearTimeout(advance); };
  }, [phase]);

  const cfg      = PHASE_CONFIG[phase];
  const isInhale = phase === "inhale";
  const isExhale = phase === "exhale";
  const isHold   = phase === "hold";

  // Circle size: small when exhaled (30), large when inhaled (56)
  const circleSize = isInhale ? 56 : isExhale ? 30 : 56;

  // Countdown dots (5 dots, filled = remaining)
  const totalDots = phase === "hold" ? 3 : 5;
  const filledDots = count;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[8px] tracking-[0.25em] uppercase" style={{ color: "rgba(246,244,239,0.25)" }}>
        Follow the Breath
      </p>

      {/* Ring */}
      <div className="relative flex items-center justify-center" style={{ width: 68, height: 68 }}>
        {/* Outer glow pulse */}
        <motion.div
          className="absolute rounded-full"
          style={{
            background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          }}
          animate={{ width: circleSize + 20, height: circleSize + 20, opacity: isHold ? [0.6, 0.9, 0.6] : 0.7 }}
          transition={{
            width:   { duration: cfg.secs, ease: isInhale ? "easeOut" : isExhale ? "easeIn" : "linear" },
            height:  { duration: cfg.secs, ease: isInhale ? "easeOut" : isExhale ? "easeIn" : "linear" },
            opacity: isHold ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0 },
          }}
        />
        {/* Main circle */}
        <motion.div
          className="absolute rounded-full"
          style={{ border: `1.5px solid ${cfg.color}`, boxShadow: `0 0 10px ${cfg.glow}` }}
          animate={{ width: circleSize, height: circleSize }}
          transition={{ duration: cfg.secs, ease: isInhale ? "easeOut" : isExhale ? "easeIn" : "linear" }}
        />
        {/* Countdown number */}
        <AnimatePresence mode="wait">
          <motion.span
            key={`${phase}-${count}`}
            className="relative z-10 font-light tabular-nums"
            style={{ fontSize: "1.1rem", color: cfg.color, lineHeight: 1 }}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          className="text-[10px] font-medium tracking-widest uppercase"
          style={{ color: cfg.color }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {cfg.label}
        </motion.p>
      </AnimatePresence>

      {/* Dot progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalDots }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 4, height: 4,
              background: i < filledDots ? cfg.color : "rgba(255,255,255,0.1)",
            }}
            animate={{ background: i < filledDots ? cfg.color : "rgba(255,255,255,0.1)" }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { session: Session }

export function SessionRoom({ session }: Props) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const isMentor = user?.uid === session.mentorId;

  // Layout
  const [leftOpen, setLeftOpen]   = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Override body background so no light bleed at edges
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#0A0908";
    return () => { document.body.style.background = prev; };
  }, []);

  // Student presence + auto-attendance on join
  useEffect(() => {
    if (!user || !userProfile || isMentor) return;

    // Mark presence (real-time online indicator)
    joinSessionPresence(session.id, user.uid, userProfile.name).catch(() => {});

    // Auto-mark attendance as present the moment they join
    upsertAttendance({
      sessionId:  session.id,
      programId:  session.programId,
      userId:     user.uid,
      userName:   userProfile.name,
      present:    true,
      date:       session.date,
    }).catch(() => {});

    return () => { leaveSessionPresence(session.id, user.uid).catch(() => {}); };
  }, [session.id, user?.uid, userProfile?.name, isMentor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer + live state
  const [elapsed, setElapsed] = useState(elapsedSince(session.startTime, session.date));
  const [live, setLive]       = useState(isSessionLive(session));
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(elapsedSince(session.startTime, session.date));
      setLive(isSessionLive(session));
    }, 1000);
    return () => clearInterval(t);
  }, [session]);

  // ── Jitsi ──────────────────────────────────────────────────────────────────

  const jitsiRef = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);
  const [micOn,  setMicOn]  = useState(isMentor);   // mentor starts unmuted, students muted
  const [camOn,  setCamOn]  = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const roomName = buildJitsiRoomName(session.id);

  const initJitsi = useCallback(() => {
    if (!jitsiRef.current || !(window as any).JitsiMeetExternalAPI || jitsiApi.current) return;

    const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
      roomName,
      parentNode: jitsiRef.current,
      userInfo: {
        displayName: userProfile?.name ?? (isMentor ? "Guide" : "Practitioner"),
        email: user?.email ?? "",
        moderator: isMentor,
      },
      configOverwrite: {
        startWithAudioMuted:          !isMentor,
        startWithVideoMuted:          false,
        prejoinPageEnabled:           false,
        disableDeepLinking:           true,
        enableWelcomePage:            false,
        disableLobbyMode:             true,
        enableLobbyChat:              false,
        requireDisplayName:           false,
        enableInsecureRoomNameWarning: false,
        disableInitialGUM:            false,
        // Skip the "waiting for moderator" gate entirely
        hiddenPremeetingButtons:      ["invite"],
        readOnlyName:                 false,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK:         false,
        SHOW_WATERMARK_FOR_GUESTS:    false,
        SHOW_BRAND_WATERMARK:         false,
        TOOLBAR_BUTTONS: isMentor
          ? ["microphone", "camera", "fullscreen", "raisehand", "tileview", "mute-everyone"]
          : [],
        MOBILE_APP_PROMO:             false,
        HIDE_INVITE_MORE_HEADER:      true,
      },
    });

    jitsiApi.current = api;

    api.addEventListener("participantJoined",      () => setOnlineCount(n => n + 1));
    api.addEventListener("participantLeft",        () => setOnlineCount(n => Math.max(1, n - 1)));
    api.addEventListener("audioMuteStatusChanged", ({ muted }: { muted: boolean }) => setMicOn(!muted));
    api.addEventListener("videoMuteStatusChanged", ({ muted }: { muted: boolean }) => setCamOn(!muted));
    api.addEventListener("videoConferenceLeft",    () => router.push(isMentor ? "/mentor" : "/dashboard/today"));
  }, [roomName, user, userProfile, isMentor, router]);

  const [jitsiScriptReady, setJitsiScriptReady] = useState(
    typeof window !== "undefined" && !!(window as any).JitsiMeetExternalAPI
  );

  // Load external Jitsi script once; track readiness separately from init
  useEffect(() => {
    if ((window as any).JitsiMeetExternalAPI) {
      setJitsiScriptReady(true);
      return () => {
        jitsiApi.current?.dispose();
        jitsiApi.current = null;
      };
    }
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setJitsiScriptReady(true);
    document.head.appendChild(script);
    return () => {
      jitsiApi.current?.dispose();
      jitsiApi.current = null;
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Init Jitsi only after BOTH the script is ready AND auth user is loaded
  useEffect(() => {
    if (!jitsiScriptReady || !user) return;
    initJitsi();
  }, [jitsiScriptReady, user, initJitsi]);

  const toggleMic = () => jitsiApi.current?.executeCommand("toggleAudio");
  const toggleCam = () => jitsiApi.current?.executeCommand("toggleVideo");
  const muteAll   = () => jitsiApi.current?.executeCommand("muteEveryone");
  const hangup    = () => { jitsiApi.current?.executeCommand("hangup"); router.push(isMentor ? "/mentor" : "/dashboard/today"); };

  // ── Participants ────────────────────────────────────────────────────────────

  const [participants, setParticipants] = useState<{ uid: string; name: string }[]>([]);
  const [pSearch, setPSearch] = useState("");

  useEffect(() => {
    getStudentsForProgram(session.programId).then(rows => {
      const relevant = session.batch ? rows.filter(r => r.enrollment.batch === session.batch) : rows;
      setParticipants([
        { uid: session.mentorId, name: session.mentorName },
        ...relevant.map(r => ({ uid: r.userProfile.uid, name: r.userProfile.name })),
      ]);
    }).catch(() => setParticipants([{ uid: session.mentorId, name: session.mentorName }]));
  }, [session]);

  const filtered = participants.filter(p => p.name.toLowerCase().includes(pSearch.toLowerCase()));

  // ── Mic Permission (mentor sees requests; students see their status) ─────────

  const [micRequests, setMicRequests] = useState<MicRequest[]>([]);
  const [myMicStatus, setMyMicStatus] = useState<MicRequest["status"] | null>(null);
  const [micRequesting, setMicRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isMentor) {
      return subscribeMicRequests(session.id, reqs => setMicRequests(reqs));
    } else {
      return subscribeMicStatus(session.id, user.uid, setMyMicStatus);
    }
  }, [session.id, user, isMentor]);

  const handleRequestMic = async () => {
    if (!user || !userProfile) return;
    setMicRequesting(true);
    await requestMicPermission(session.id, user.uid, userProfile.name).catch(() => {});
    setMicRequesting(false);
  };

  const handleRespondMic = async (userId: string, approved: boolean) => {
    await respondToMicRequest(session.id, userId, approved);
    if (approved) {
      // Notify via chat
      await sendChatMessage(session.id, session.mentorId, session.mentorName,
        `${micRequests.find(r => r.userId === userId)?.userName ?? "A student"} has been given mic access.`
      ).catch(() => {});
    }
  };

  // Auto-mute student if denied
  useEffect(() => {
    if (!isMentor && myMicStatus === "denied" && micOn) {
      jitsiApi.current?.executeCommand("toggleAudio");
    }
  }, [myMicStatus, isMentor, micOn]);

  const pendingRequests = micRequests.filter(r => r.status === "pending");
  const approvedForMic  = myMicStatus === "approved";

  // ── Chat ────────────────────────────────────────────────────────────────────

  const [messages, setMessages]  = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToChatMessages(session.id, setMessages), [session.id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = async () => {
    const text = chatInput.trim();
    if (!text || !user || !userProfile) return;
    setChatInput("");
    await sendChatMessage(session.id, user.uid, userProfile.name, text);
  };

  // ── Ambience ────────────────────────────────────────────────────────────────

  const ambienceRef = useRef(new AmbienceEngine());
  const [ambience, setAmbience]   = useState<AmbienceId | null>(null);
  const [ambienceVol, setAmbienceVol] = useState(0.45);

  useEffect(() => () => ambienceRef.current.stop(), []);

  const selectAmbience = (id: AmbienceId) => {
    if (id === ambience) {
      ambienceRef.current.stop();
      setAmbience(null);
    } else {
      ambienceRef.current.play(id);
      setAmbience(id);
    }
  };

  const changeVolume = (v: number) => {
    setAmbienceVol(v);
    ambienceRef.current.setVolume(v);
  };

  // ── Reactions ───────────────────────────────────────────────────────────────

  const REACTIONS = ["🔥","❤️","🙏","✨","🌿","🏆","👏"];
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string }[]>([]);

  const sendReaction = (emoji: string) => {
    const id = Date.now();
    setFloatingReactions(r => [...r, { id, emoji }]);
    setTimeout(() => setFloatingReactions(r => r.filter(x => x.id !== id)), 1800);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full select-none" style={{ background: "#0A0908", color: "#F6F4EF" }}>

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center h-12 px-4 gap-3 flex-shrink-0 relative"
        style={{
          background: isMentor ? "#0C0B09" : "#111009",
          borderBottom: `1px solid ${isMentor ? "rgba(122,140,116,0.18)" : "rgba(255,255,255,0.07)"}`,
        }}
      >
        {/* Left: toggle + title + badges */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setLeftOpen(o => !o)}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <span style={{ fontSize: 11, color: "rgba(246,244,239,0.5)" }}>≡</span>
          </button>
          <span className="text-sm font-light truncate" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F6F4EF" }}>
            {session.title}
          </span>
          {isMentor && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] tracking-widest uppercase flex-shrink-0 font-medium"
              style={{ background: "rgba(122,140,116,0.2)", color: "#7A9C74", border: "1px solid rgba(122,140,116,0.35)" }}>
              <Crown size={9} /> Guide
            </span>
          )}
          <AnimatePresence>
            {live && (
              <motion.div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              >
                <motion.span className="w-1.5 h-1.5 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                <span className="text-[9px] font-bold tracking-widest text-red-400">LIVE</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: timer */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums" style={{ color: "rgba(246,244,239,0.55)" }}>
            {elapsed}
          </span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Mic toggle */}
          <motion.button onClick={toggleMic}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: micOn ? "rgba(255,255,255,0.07)" : "rgba(220,38,38,0.18)" }}
            whileHover={{ opacity: 0.8 }} whileTap={{ scale: 0.9 }}
            title={!isMentor && !approvedForMic ? "Request mic access below" : undefined}
          >
            {micOn
              ? <Mic size={12} style={{ color: "rgba(246,244,239,0.65)" }} />
              : <MicOff size={12} style={{ color: "#ef4444" }} />
            }
          </motion.button>

          {/* Cam toggle */}
          <motion.button onClick={toggleCam}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: camOn ? "rgba(255,255,255,0.07)" : "rgba(220,38,38,0.18)" }}
            whileHover={{ opacity: 0.8 }} whileTap={{ scale: 0.9 }}
          >
            {camOn
              ? <Video size={12} style={{ color: "rgba(246,244,239,0.65)" }} />
              : <VideoOff size={12} style={{ color: "#ef4444" }} />
            }
          </motion.button>

          {/* Leave / End */}
          <motion.button onClick={hangup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-1"
            style={{ background: "#dc2626", color: "#fff" }}
            whileHover={{ background: "#b91c1c" }} whileTap={{ scale: 0.95 }}
          >
            <LogOut size={11} />
            <span className="hidden sm:inline">{isMentor ? "End" : "Leave"}</span>
          </motion.button>
        </div>
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.div key="left"
              className="flex flex-col flex-shrink-0"
              style={{ width: 220, background: "#111009", borderRight: "1px solid rgba(255,255,255,0.06)" }}
              initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.4)" }}>
                  Participants · {participants.length}
                </p>
                <button onClick={() => setLeftOpen(false)}
                  className="p-1 rounded" style={{ color: "rgba(246,244,239,0.25)" }}>
                  <ChevronLeft size={12} />
                </button>
              </div>

              {/* Mentor: pending mic requests */}
              {isMentor && pendingRequests.length > 0 && (
                <div className="mx-2 mt-2 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <p className="px-3 pt-2 pb-1 text-[9px] tracking-widest uppercase"
                    style={{ color: "rgba(220,38,38,0.7)" }}>
                    🙋 {pendingRequests.length} Mic Request{pendingRequests.length > 1 ? "s" : ""}
                  </p>
                  {pendingRequests.map(req => (
                    <div key={req.userId} className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-xs truncate flex-1 mr-2" style={{ color: "#F6F4EF" }}>
                        {req.userName}
                      </p>
                      <div className="flex gap-1">
                        <motion.button onClick={() => handleRespondMic(req.userId, true)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(122,140,116,0.25)" }}
                          whileHover={{ background: "rgba(122,140,116,0.4)" }} whileTap={{ scale: 0.9 }}>
                          <Check size={10} style={{ color: "#7A9C74" }} />
                        </motion.button>
                        <motion.button onClick={() => handleRespondMic(req.userId, false)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(220,38,38,0.15)" }}
                          whileHover={{ background: "rgba(220,38,38,0.3)" }} whileTap={{ scale: 0.9 }}>
                          <X size={10} style={{ color: "#ef4444" }} />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="px-3 py-2 flex-shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Search size={10} style={{ color: "rgba(246,244,239,0.3)", flexShrink: 0 }} />
                  <input value={pSearch} onChange={e => setPSearch(e.target.value)}
                    placeholder="Search" className="bg-transparent outline-none flex-1 text-xs min-w-0"
                    style={{ color: "rgba(246,244,239,0.65)" }} />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {filtered.slice(0, 15).map(p => {
                  const isGuide  = p.uid === session.mentorId;
                  const micReq   = micRequests.find(r => r.userId === p.uid);
                  const hasMic   = isGuide || micReq?.status === "approved";
                  return (
                    <div key={p.uid}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                      style={{ background: isGuide ? "rgba(122,140,116,0.1)" : "transparent" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                        style={{ background: avatarColor(p.name), color: "#F6F4EF" }}>
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate" style={{ color: "#F6F4EF" }}>{p.name}</p>
                        {isGuide && (
                          <p className="text-[9px] tracking-widest" style={{ color: "#7A9C74" }}>GUIDE</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasMic
                          ? <Mic size={9} style={{ color: "#7A9C74" }} />
                          : <MicOff size={9} style={{ color: "rgba(246,244,239,0.2)" }} />
                        }
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                      </div>
                    </div>
                  );
                })}
                {filtered.length > 15 && (
                  <p className="text-[10px] px-2 py-1" style={{ color: "rgba(246,244,239,0.25)" }}>
                    +{filtered.length - 15} more
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!leftOpen && (
          <button onClick={() => setLeftOpen(true)}
            className="flex-shrink-0 flex items-center justify-center w-5"
            style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <ChevronRight size={11} style={{ color: "rgba(246,244,239,0.25)" }} />
          </button>
        )}

        {/* ── CENTER: JITSI ───────────────────────────────────────────────── */}
        <div className="flex-1 relative min-w-0" style={{ background: "#0A0908" }}>

          <div ref={jitsiRef} className="absolute inset-0" />

          {/* Floating reactions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <AnimatePresence>
              {floatingReactions.map(({ id, emoji }) => (
                <motion.span key={id} className="absolute text-3xl"
                  style={{ left: `${(Math.random() - 0.5) * 80}px`, bottom: 0 }}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -90, scale: 1.3 }}
                  transition={{ duration: 1.6, ease: "easeOut" }}>
                  {emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.div key="right"
              className="flex flex-col flex-shrink-0"
              style={{
                width: 264,
                background: isMentor ? "#0E0D0B" : "#111009",
                borderLeft: `1px solid ${isMentor ? "rgba(122,140,116,0.12)" : "rgba(255,255,255,0.06)"}`,
              }}
              initial={{ width: 0, opacity: 0 }} animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: `1px solid ${isMentor ? "rgba(122,140,116,0.1)" : "rgba(255,255,255,0.05)"}` }}>
                <p className="text-[10px] tracking-widest uppercase" style={{ color: isMentor ? "rgba(122,140,116,0.7)" : "rgba(246,244,239,0.4)" }}>
                  {isMentor ? "Guide Console" : "Class Chat"}
                </p>
                <button onClick={() => setRightOpen(false)}
                  className="p-1 rounded" style={{ color: "rgba(246,244,239,0.25)" }}>
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
                <div className="text-center">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full"
                    style={{ background: "rgba(122,140,116,0.12)", color: "#7A9C74" }}>
                    Session started · {session.title}
                  </span>
                </div>
                {messages.map(msg => {
                  const isMe    = msg.userId === user?.uid;
                  const isGuide = msg.userId === session.mentorId;
                  return (
                    <div key={msg.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-medium mt-0.5"
                        style={{ background: isGuide ? "#5C6B57" : avatarColor(msg.userName), color: "#F6F4EF" }}>
                        {initials(msg.userName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-[11px] font-medium"
                            style={{ color: isGuide ? "#7A9C74" : "#F6F4EF" }}>
                            {msg.userName.split(" ")[0]}
                          </p>
                          <p className="text-[9px]" style={{ color: "rgba(246,244,239,0.25)" }}>
                            {msgTime(msg.createdAt)}
                          </p>
                        </div>
                        <p className="text-xs leading-relaxed mt-0.5"
                          style={{ color: isMe ? "rgba(246,244,239,0.85)" : "rgba(246,244,239,0.6)" }}>
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message input */}
              <div className="px-3 py-2 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Send a message…" className="flex-1 bg-transparent outline-none text-xs min-w-0"
                    style={{ color: "rgba(246,244,239,0.7)" }} />
                  <motion.button onClick={sendMsg}
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: chatInput.trim() ? "#5C6B57" : "rgba(255,255,255,0.05)" }}
                    whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.9 }}>
                    <Send size={10} style={{ color: chatInput.trim() ? "#F6F4EF" : "rgba(246,244,239,0.25)" }} />
                  </motion.button>
                </div>
              </div>

              {/* Bottom panel: Ambience for students, Session tools for mentor */}
              {isMentor ? (
                <div className="px-3 py-3 flex-shrink-0 space-y-2">
                  <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "rgba(246,244,239,0.3)" }}>
                    Session Tools
                  </p>
                  {/* Ambience control (mentor can set the vibe for the class) */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Volume2 size={10} style={{ color: "rgba(246,244,239,0.35)" }} />
                      <span className="text-[10px]" style={{ color: "rgba(246,244,239,0.35)" }}>Ambience</span>
                    </div>
                    {ambience && ambience !== "silence" && (
                      <input type="range" min="0" max="1" step="0.05"
                        value={ambienceVol}
                        onChange={e => changeVolume(parseFloat(e.target.value))}
                        className="w-14 h-1 accent-green-700"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["ocean","forest","bowl","silence"] as AmbienceId[]).map(id => {
                      const labels: Record<AmbienceId, string> = { ocean: "🌊 Ocean", forest: "🌲 Forest", bowl: "🔔 Bowl", silence: "— Silence" };
                      const active = ambience === id;
                      return (
                        <motion.button key={id} onClick={() => selectAmbience(id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs text-left"
                          style={{
                            background: active ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${active ? "rgba(122,140,116,0.4)" : "rgba(255,255,255,0.06)"}`,
                            color: active ? "#7A9C74" : "rgba(246,244,239,0.4)",
                          }}
                          whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.95 }}>
                          {labels[id]}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Volume2 size={10} style={{ color: "rgba(246,244,239,0.35)" }} />
                      <p className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.35)" }}>
                        Ambience
                      </p>
                    </div>
                    {ambience && ambience !== "silence" && (
                      <input type="range" min="0" max="1" step="0.05"
                        value={ambienceVol}
                        onChange={e => changeVolume(parseFloat(e.target.value))}
                        className="w-16 h-1 accent-green-700"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["ocean","forest","bowl","silence"] as AmbienceId[]).map(id => {
                      const labels: Record<AmbienceId, string> = { ocean: "🌊 Ocean", forest: "🌲 Forest", bowl: "🔔 Bowl", silence: "— Silence" };
                      const active = ambience === id;
                      return (
                        <motion.button key={id} onClick={() => selectAmbience(id)}
                          className="px-2.5 py-2 rounded-xl text-xs text-left"
                          style={{
                            background: active ? "rgba(122,140,116,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${active ? "rgba(122,140,116,0.4)" : "rgba(255,255,255,0.06)"}`,
                            color: active ? "#7A9C74" : "rgba(246,244,239,0.45)",
                          }}
                          whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.95 }}>
                          {labels[id]}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!rightOpen && (
          <button onClick={() => setRightOpen(true)}
            className="flex-shrink-0 flex items-center justify-center w-5"
            style={{ background: "rgba(255,255,255,0.02)", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
            <ChevronLeft size={11} style={{ color: "rgba(246,244,239,0.25)" }} />
          </button>
        )}
      </div>

      {/* ══ BOTTOM BAR ════════════════════════════════════════════════════════ */}
      {isMentor ? (
        /* ── MENTOR bottom bar: professional session controls ── */
        <div
          className="flex items-center px-4 h-16 flex-shrink-0 gap-3"
          style={{ background: "#0E0D0B", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Left: live stats */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                style={{ boxShadow: "0 0 6px rgba(52,211,153,0.6)" }} />
              <span className="text-xs tabular-nums" style={{ color: "rgba(246,244,239,0.55)" }}>
                {onlineCount} online
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="font-mono text-xs tabular-nums" style={{ color: "rgba(246,244,239,0.4)" }}>
                {elapsed}
              </span>
            </div>
          </div>

          {/* Center: mic request queue */}
          <div className="flex items-center gap-2 justify-center flex-1">
            {pendingRequests.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={pendingRequests[0].userId}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(212,168,71,0.1)", border: "1px solid rgba(212,168,71,0.3)" }}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                >
                  <Hand size={11} style={{ color: "#D4A847", flexShrink: 0 }} />
                  <span className="text-xs truncate max-w-[100px]" style={{ color: "#D4A847" }}>
                    {pendingRequests[0].userName.split(" ")[0]}
                  </span>
                  <div className="flex gap-1">
                    <motion.button onClick={() => handleRespondMic(pendingRequests[0].userId, true)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(122,140,116,0.3)" }}
                      whileHover={{ background: "rgba(122,140,116,0.5)" }} whileTap={{ scale: 0.9 }}>
                      <Check size={10} style={{ color: "#7A9C74" }} />
                    </motion.button>
                    <motion.button onClick={() => handleRespondMic(pendingRequests[0].userId, false)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(220,38,38,0.2)" }}
                      whileHover={{ background: "rgba(220,38,38,0.35)" }} whileTap={{ scale: 0.9 }}>
                      <X size={10} style={{ color: "#ef4444" }} />
                    </motion.button>
                  </div>
                  {pendingRequests.length > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(212,168,71,0.2)", color: "#D4A847" }}>
                      +{pendingRequests.length - 1}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(246,244,239,0.15)" }}>
                No requests
              </span>
            )}
          </div>

          {/* Right: mute all + reactions as small icons */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <motion.button onClick={muteAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(246,244,239,0.5)" }}
              whileHover={{ background: "rgba(255,255,255,0.1)", color: "#F6F4EF" }} whileTap={{ scale: 0.95 }}>
              <Shield size={11} /> Mute All
            </motion.button>
            <div className="flex items-center gap-1">
              {REACTIONS.slice(0, 4).map(emoji => (
                <motion.button key={emoji} onClick={() => sendReaction(emoji)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  whileHover={{ background: "rgba(255,255,255,0.09)", scale: 1.12 }}
                  whileTap={{ scale: 0.85 }}>
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── STUDENT bottom bar ── */
        <div
          className="flex items-center justify-between px-4 h-20 flex-shrink-0 gap-4"
          style={{ background: "#111009", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Left: reactions OR mic request */}
          <div className="flex items-center gap-1.5 flex-1">
            {!approvedForMic ? (
              <motion.button
                onClick={handleRequestMic}
                disabled={micRequesting || myMicStatus === "pending"}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: myMicStatus === "pending"
                    ? "rgba(212,168,71,0.15)"
                    : myMicStatus === "denied"
                    ? "rgba(220,38,38,0.12)"
                    : "rgba(255,255,255,0.07)",
                  border: `1px solid ${
                    myMicStatus === "pending" ? "rgba(212,168,71,0.3)"
                    : myMicStatus === "denied" ? "rgba(220,38,38,0.25)"
                    : "rgba(255,255,255,0.1)"
                  }`,
                  color: myMicStatus === "pending" ? "#D4A847"
                    : myMicStatus === "denied" ? "#ef4444"
                    : "rgba(246,244,239,0.65)",
                }}
                whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
              >
                <Hand size={13} />
                {myMicStatus === "pending" ? "Request sent…"
                  : myMicStatus === "denied" ? "Mic denied"
                  : "Request Mic"}
              </motion.button>
            ) : (
              REACTIONS.map(emoji => (
                <motion.button key={emoji} onClick={() => sendReaction(emoji)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)", scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}>
                  {emoji}
                </motion.button>
              ))
            )}
          </div>

          {/* Center: breathe ring */}
          <BreatheRing />

          {/* Right: approved mic control */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {approvedForMic && (
              <motion.button onClick={toggleMic}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: micOn ? "rgba(122,140,116,0.2)" : "rgba(220,38,38,0.15)",
                  border: `1px solid ${micOn ? "rgba(122,140,116,0.4)" : "rgba(220,38,38,0.3)"}`,
                  color: micOn ? "#7A9C74" : "#ef4444",
                }}
                whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              >
                {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                {micOn ? "Mic On" : "Unmute"}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
