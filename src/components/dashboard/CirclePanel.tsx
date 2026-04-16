"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Users, Compass, X, MoreHorizontal, Trash2,
  UserPlus, UserCheck, Loader, MessageCircle, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeCircleFeed, createCirclePost, deleteCirclePost,
  toggleCircleLike, toggleNamasteReaction, toggleFireReaction,
  addCircleComment, subscribeCircleComments,
  getCircleMembers, getFollowing, followUser, unfollowUser, getFollowerCount,
  type CirclePost, type CircleComment,
} from "@/lib/firestore";
import type { UserProfile } from "@/types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CATEGORIES = [
  { id: "Milestone",  icon: "🏆", label: "Milestone"  },
  { id: "Insight",    icon: "💡", label: "Insight"    },
  { id: "Question",   icon: "❓", label: "Question"   },
  { id: "Motivation", icon: "🔥", label: "Motivation" },
];

const GUIDELINES = [
  "Be kind, be honest, support each other's journey.",
  "No spam or self-promotion.",
  "This is a sacred space for genuine practitioners.",
];

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, photoURL, size = 40 }: { name: string; photoURL?: string | null; size?: number }) {
  const initials = (name || "U").trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  if (photoURL) return <img src={photoURL} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 select-none"
      style={{ width: size, height: size, background: "radial-gradient(circle at 35% 35%, #7A8C74, #3D4A39)", fontSize: size * 0.33, fontFamily: "'Cormorant Garamond', serif", color: "rgba(246,244,239,0.9)", fontWeight: 500 }}>
      {initials}
    </div>
  );
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

function ComposeBox({ onPost }: { onPost: () => void }) {
  const { user, userProfile } = useAuth();
  const [content, setContent]   = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [posting, setPosting]   = useState(false);

  const submit = async () => {
    if (!user || !userProfile || !content.trim()) return;
    setPosting(true);
    const initials = userProfile.name.trim().split(/\s+/).map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    await createCirclePost({
      userId: user.uid, userName: userProfile.name, userInitials: initials,
      photoURL: userProfile.photoURL ?? null,
      content: content.trim(), mood: null, category: category ?? null,
      programId: userProfile.programId ?? null, programTitle: userProfile.programTitle ?? null,
      createdAt: new Date().toISOString(),
    });
    setContent(""); setCategory(null); setPosting(false);
    onPost();
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #D4CCBF" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "#2C2B29", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
        Share with the Circle
      </p>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Share a reflection, question, or milestone with fellow practitioners..."
        rows={3}
        className="w-full resize-none outline-none text-sm leading-relaxed bg-transparent"
        style={{ color: "#2C2B29", fontWeight: 300 }}
      />
      {/* Category tags */}
      <div className="flex flex-wrap gap-2 mt-3 mb-4">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(category === c.id ? null : c.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
            style={{
              background: category === c.id ? "rgba(92,107,87,0.12)" : "rgba(44,43,41,0.05)",
              color: category === c.id ? "#5C6B57" : "#9A9490",
              border: category === c.id ? "1px solid rgba(92,107,87,0.3)" : "1px solid transparent",
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <motion.button onClick={submit} disabled={!content.trim() || posting}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium"
          style={{ background: content.trim() ? "#5C6B57" : "#D4CCBF", color: "#F6F4EF" }}
          whileTap={{ scale: 0.96 }}>
          {posting ? <Loader size={14} className="animate-spin" /> : <>Post to Circle 🙏</>}
        </motion.button>
      </div>
    </div>
  );
}

// ─── Comment Thread ────────────────────────────────────────────────────────────

function CommentThread({ post, onClose }: { post: CirclePost; onClose: () => void }) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<CircleComment[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeCircleComments(post.id, setComments), [post.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments.length]);

  const send = async () => {
    if (!user || !userProfile || !text.trim()) return;
    setSending(true);
    const initials = userProfile.name.trim().split(/\s+/).map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
    await addCircleComment({ postId: post.id, userId: user.uid, userName: userProfile.name, userInitials: initials, content: text.trim(), createdAt: new Date().toISOString() });
    setText(""); setSending(false);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(44,43,41,0.55)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="w-full md:max-w-xl rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "#F6F4EF", maxHeight: "85vh" }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #E8E1D6" }}>
          <h3 className="text-sm font-medium" style={{ color: "#2C2B29" }}>Comments · {comments.length}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "#9A9490" }}><X size={15} /></button>
        </div>
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #E8E1D6", background: "rgba(92,107,87,0.04)" }}>
          <div className="flex gap-3">
            <Avatar name={post.userName} photoURL={post.photoURL} size={32} />
            <div>
              <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{post.userName}</p>
              <p className="text-sm mt-0.5" style={{ color: "#4A4845", fontWeight: 300 }}>{post.content}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {comments.length === 0 && <p className="text-xs text-center py-8" style={{ color: "#C4BDB5" }}>Be the first to comment</p>}
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.userName} size={28} />
              <div className="flex-1 min-w-0">
                <div className="inline-block px-3.5 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: "#fff", border: "1px solid #E8E1D6" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#5C6B57" }}>{c.userName}</p>
                  <p className="text-sm" style={{ color: "#2C2B29", fontWeight: 300 }}>{c.content}</p>
                </div>
                <p className="text-[10px] mt-1 ml-1" style={{ color: "#C4BDB5" }}>{timeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-4 py-3 flex gap-2.5 flex-shrink-0" style={{ borderTop: "1px solid #E8E1D6" }}>
          <Avatar name={userProfile?.name ?? "You"} photoURL={userProfile?.photoURL} size={30} />
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "#fff", border: "1px solid #D4CCBF" }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Add a comment…" className="flex-1 bg-transparent outline-none text-sm" style={{ color: "#2C2B29" }} autoFocus />
            <motion.button onClick={send} disabled={!text.trim() || sending} whileTap={{ scale: 0.9 }} style={{ color: text.trim() ? "#5C6B57" : "#C4BDB5" }}>
              {sending ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, following, onFollowChange }: {
  post: CirclePost; currentUserId: string; following: Set<string>; onFollowChange: (uid: string, f: boolean) => void;
}) {
  const isOwn = post.userId === currentUserId;
  const namasted = (post.namasteBy ?? []).includes(currentUserId);
  const liked    = post.likedBy.includes(currentUserId);
  const fired    = (post.fireBy ?? []).includes(currentUserId);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const isFollowing = following.has(post.userId);

  const catInfo = CATEGORIES.find(c => c.id === post.category);

  const handleFollow = async () => {
    if (isFollowing) { await unfollowUser(currentUserId, post.userId); onFollowChange(post.userId, false); }
    else { await followUser(currentUserId, post.userId); onFollowChange(post.userId, true); }
  };

  return (
    <>
      <motion.div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E8E1D6" }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: deleting ? 0 : 1, y: 0, height: deleting ? 0 : "auto" }}
        transition={{ duration: 0.25 }} layout>
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={post.userName} photoURL={post.photoURL} size={40} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>{post.userName}</p>
                {catInfo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(92,107,87,0.08)", color: "#5C6B57", border: "1px solid rgba(92,107,87,0.15)" }}>
                    {catInfo.icon} {catInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#C4BDB5" }}>{timeAgo(post.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOwn && (
              <motion.button onClick={handleFollow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: isFollowing ? "rgba(92,107,87,0.1)" : "transparent", color: isFollowing ? "#5C6B57" : "#9A9490", border: "1px solid #E8E1D6" }}
                whileTap={{ scale: 0.94 }}>
                {isFollowing ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>}
              </motion.button>
            )}
            {isOwn && (
              <div className="relative">
                <button onClick={() => setShowMenu(v => !v)} className="p-1.5 rounded-lg" style={{ color: "#C4BDB5" }}>
                  <MoreHorizontal size={16} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div className="absolute right-0 top-8 z-10 rounded-xl overflow-hidden w-36"
                      style={{ background: "#fff", border: "1px solid #E8E1D6", boxShadow: "0 8px 24px rgba(44,43,41,0.1)" }}
                      initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <button onClick={() => { setShowMenu(false); setDeleting(true); deleteCirclePost(post.id); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-left" style={{ color: "#ef4444" }}>
                        <Trash2 size={12} /> Delete post
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: "#2C2B29", fontWeight: 300, whiteSpace: "pre-wrap" }}>{post.content}</p>
        </div>

        {/* Reactions */}
        <div className="px-5 py-3 flex items-center gap-4" style={{ borderTop: "1px solid #F0EBE3" }}>
          {/* 🙏 Namaste */}
          <motion.button onClick={() => toggleNamasteReaction(post.id, currentUserId, namasted)}
            className="flex items-center gap-1.5 text-sm" whileTap={{ scale: 0.85 }}>
            <span className="text-base" style={{ filter: namasted ? "none" : "grayscale(0.5)", opacity: namasted ? 1 : 0.5 }}>🙏</span>
            {(post.namasteBy ?? []).length > 0 && <span className="text-xs" style={{ color: "#9A9490" }}>{(post.namasteBy ?? []).length}</span>}
          </motion.button>
          {/* ❤️ Heart */}
          <motion.button onClick={() => toggleCircleLike(post.id, currentUserId, liked)}
            className="flex items-center gap-1.5 text-sm" whileTap={{ scale: 0.85 }}>
            <span className="text-base" style={{ filter: liked ? "none" : "grayscale(0.5)", opacity: liked ? 1 : 0.5 }}>❤️</span>
            {post.likedBy.length > 0 && <span className="text-xs" style={{ color: "#9A9490" }}>{post.likedBy.length}</span>}
          </motion.button>
          {/* 🔥 Fire */}
          <motion.button onClick={() => toggleFireReaction(post.id, currentUserId, fired)}
            className="flex items-center gap-1.5 text-sm" whileTap={{ scale: 0.85 }}>
            <span className="text-base" style={{ filter: fired ? "none" : "grayscale(0.5)", opacity: fired ? 1 : 0.5 }}>🔥</span>
            {(post.fireBy ?? []).length > 0 && <span className="text-xs" style={{ color: "#9A9490" }}>{(post.fireBy ?? []).length}</span>}
          </motion.button>
          {/* 💬 Comments */}
          <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5 text-sm ml-1" style={{ color: "#9A9490" }}>
            <MessageCircle size={15} strokeWidth={1.5} />
            {post.commentCount > 0 && <span className="text-xs">{post.commentCount}</span>}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showComments && <CommentThread post={post} onClose={() => setShowComments(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── People Tab ───────────────────────────────────────────────────────────────

function PeopleTab({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers]           = useState<UserProfile[]>([]);
  const [following, setFollowing]       = useState<Set<string>>(new Set());
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");

  useEffect(() => {
    Promise.all([getCircleMembers(), getFollowing(currentUserId)])
      .then(([m, f]) => {
        const others = m.filter(u => u.uid !== currentUserId);
        setMembers(others);
        setFollowing(new Set(f));
        Promise.all(others.map(u => getFollowerCount(u.uid))).then(counts => {
          const map: Record<string, number> = {};
          others.forEach((u, i) => { map[u.uid] = counts[i]; });
          setFollowerCounts(map);
        });
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [currentUserId]);

  const handleFollow = async (uid: string) => {
    if (following.has(uid)) { await unfollowUser(currentUserId, uid); setFollowing(prev => { const s = new Set(prev); s.delete(uid); return s; }); }
    else { await followUser(currentUserId, uid); setFollowing(prev => new Set([...prev, uid])); }
  };

  const filtered = members.filter(m => (m.name ?? "").toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="flex justify-center py-16">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="w-6 h-6 rounded-full border-2 border-t-transparent" style={{ borderColor: "#5C6B57" }} />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9A9490" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "#fff", border: "1px solid #D4CCBF", color: "#2C2B29" }} />
      </div>
      {filtered.length === 0 && <div className="text-center py-10"><p className="text-sm" style={{ color: "#9A9490" }}>No members found</p></div>}
      <div className="space-y-2">
        {filtered.map((m, i) => (
          <motion.div key={m.uid} className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: "#fff", border: "1px solid #E8E1D6" }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex items-center gap-3">
              <Avatar name={m.name} photoURL={m.photoURL} size={42} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>{m.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {m.programTitle && <span className="text-[10px]" style={{ color: "#5C6B57" }}>{m.programTitle}</span>}
                  <span className="text-[10px]" style={{ color: "#C4BDB5" }}>{followerCounts[m.uid] ?? 0} followers</span>
                </div>
              </div>
            </div>
            <motion.button onClick={() => handleFollow(m.uid)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: following.has(m.uid) ? "rgba(92,107,87,0.1)" : "#5C6B57", color: following.has(m.uid) ? "#5C6B57" : "#F6F4EF", border: following.has(m.uid) ? "1px solid rgba(92,107,87,0.25)" : "none" }}
              whileTap={{ scale: 0.94 }}>
              {following.has(m.uid) ? <><UserCheck size={11} /> Following</> : <><UserPlus size={11} /> Follow</>}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Online Now ───────────────────────────────────────────────────────────────

function OnlineNowPanel({ posts }: { posts: CirclePost[] }) {
  // Derive "online" from posts in the last 24h
  const seen = new Set<string>();
  const recentUsers: { userId: string; userName: string; photoURL?: string | null }[] = [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  for (const p of posts) {
    if (!seen.has(p.userId) && new Date(p.createdAt).getTime() > cutoff) {
      seen.add(p.userId);
      recentUsers.push({ userId: p.userId, userName: p.userName, photoURL: p.photoURL });
    }
    if (recentUsers.length >= 8) break;
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #E8E1D6" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <p className="text-sm font-medium" style={{ color: "#2C2B29" }}>Online Now</p>
      </div>
      {recentUsers.length === 0 ? (
        <p className="text-xs" style={{ color: "#C4BDB5" }}>No recent activity</p>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: "#9A9490" }}>
            {recentUsers.length} practitioner{recentUsers.length !== 1 ? "s" : ""} active · Past 24 hours
          </p>
          <div className="flex flex-wrap gap-2">
            {recentUsers.map(u => (
              <div key={u.userId} title={u.userName}>
                <Avatar name={u.userName} photoURL={u.photoURL} size={34} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Milestone Board ──────────────────────────────────────────────────────────

function MilestoneBoardPanel({ posts }: { posts: CirclePost[] }) {
  const milestones = posts.filter(p => p.category === "Milestone").slice(0, 3);
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #E8E1D6" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "#2C2B29" }}>Milestone Board</p>
      {milestones.length === 0 ? (
        <p className="text-xs" style={{ color: "#C4BDB5" }}>No milestones shared yet</p>
      ) : (
        <div className="space-y-3">
          {milestones.map((p, i) => (
            <div key={p.id} className="flex items-start gap-2.5" style={{ borderBottom: i < milestones.length - 1 ? "1px solid #F0EBE3" : "none", paddingBottom: i < milestones.length - 1 ? 12 : 0 }}>
              <span className="text-lg">{i === 0 ? "🏆" : i === 1 ? "🔥" : "⭐"}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#2C2B29" }}>{p.userName}</p>
                <p className="text-xs leading-snug mt-0.5 line-clamp-2" style={{ color: "#9A9490", fontWeight: 300 }}>{p.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Circle Guidelines ────────────────────────────────────────────────────────

function GuidelinesPanel() {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #E8E1D6" }}>
      <p className="text-sm font-medium mb-3" style={{ color: "#2C2B29" }}>Circle Guidelines</p>
      <ul className="space-y-2">
        {GUIDELINES.map((g, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-xs mt-0.5" style={{ color: "#5C6B57" }}>·</span>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9490", fontWeight: 300 }}>{g}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CirclePanel() {
  const { user, userProfile } = useAuth();
  const [tab, setTab]         = useState<"feed" | "people">("feed");
  const [posts, setPosts]     = useState<CirclePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeCircleFeed(p => { setPosts(p); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    getFollowing(user.uid).then(f => setFollowing(new Set(f)));
  }, [user?.uid]);

  const handleFollowChange = useCallback((uid: string, nowFollowing: boolean) => {
    setFollowing(prev => { const s = new Set(prev); nowFollowing ? s.add(uid) : s.delete(uid); return s; });
  }, []);

  if (!user || !userProfile) return null;

  const TABS = [
    { id: "feed"   as const, label: "Circle Feed", icon: <Compass size={13} /> },
    { id: "people" as const, label: "People",      icon: <Users size={13} />   },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 300, color: "#2C2B29" }}>
          Community Circle
        </h1>
        <p className="text-xs mt-1" style={{ color: "#9A9490" }}>Connect with fellow practitioners</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "#E8E1D6" }}>
        {TABS.map(t => (
          <motion.button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium"
            animate={{ background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#2C2B29" : "#9A9490", boxShadow: tab === t.id ? "0 1px 4px rgba(44,43,41,0.08)" : "none" }}
            transition={{ duration: 0.15 }}>
            {t.icon} {t.label}
          </motion.button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            {tab === "feed" ? (
              <motion.div key="feed" className="space-y-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                <ComposeBox onPost={() => {}} />
                {loading ? (
                  <div className="flex justify-center py-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="w-7 h-7 rounded-full border-2 border-t-transparent" style={{ borderColor: "#5C6B57" }} />
                  </div>
                ) : posts.length === 0 ? (
                  <motion.div className="rounded-2xl p-14 flex flex-col items-center text-center"
                    style={{ background: "#fff", border: "1px solid #E8E1D6" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="text-5xl mb-4">🌿</div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, color: "#2C2B29" }}>
                      The circle is quiet
                    </p>
                    <p className="text-xs mt-2" style={{ color: "#9A9490" }}>Be the first to share something with your fellow practitioners</p>
                  </motion.div>
                ) : (
                  posts.map(post => (
                    <PostCard key={post.id} post={post} currentUserId={user.uid} following={following} onFollowChange={handleFollowChange} />
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div key="people" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                <PeopleTab currentUserId={user.uid} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: sidebar — only shown on feed tab and md+ screens */}
        {tab === "feed" && (
          <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
            <OnlineNowPanel posts={posts} />
            <MilestoneBoardPanel posts={posts} />
            <GuidelinesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
