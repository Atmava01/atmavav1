"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, X, LayoutDashboard, Shield, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, signOut } = useAuth();
  const { scrollY } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/mentor");
  if (isDashboard) return null;

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    router.push("/");
  };

  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  const portalLink = user
    ? userProfile?.role === "admin"  ? { label: "Admin",     href: "/admin"     }
    : userProfile?.role === "mentor" ? { label: "Mentor",    href: "/mentor"    }
    :                                  { label: "Dashboard", href: "/dashboard" }
    : null;

  return (
    <>
      <motion.header className="fixed top-0 left-0 right-0 z-50">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "#F6F4EF", opacity: bgOpacity, borderBottom: "1px solid #D4CCBF" }}
        />
        <nav className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/">
            <motion.span
              className="text-2xl tracking-[0.18em] uppercase"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29", fontWeight: 400 }}
              whileHover={{ opacity: 0.7 }}
            >
              Atmava
            </motion.span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {/* Home — scrolls to top if already on landing page */}
            <motion.span
              className="text-sm tracking-widest uppercase relative cursor-pointer"
              style={{ color: pathname === "/" ? "#5C6B57" : "#4A4845", letterSpacing: "0.12em", fontWeight: pathname === "/" ? 600 : 400 }}
              whileHover={{ color: "#2C2B29" }}
              onClick={() => {
                if (pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push(user ? "/?preview=1" : "/");
                }
              }}
            >
              Home
              {pathname === "/" && (
                <motion.span layoutId="nav-indicator" className="absolute -bottom-1 left-0 right-0 h-px" style={{ background: "#5C6B57" }} />
              )}
            </motion.span>

            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                <motion.span
                  className="text-sm tracking-widest uppercase relative"
                  style={{ color: pathname === l.href ? "#5C6B57" : "#4A4845", letterSpacing: "0.12em", fontWeight: pathname === l.href ? 600 : 400 }}
                  whileHover={{ color: "#2C2B29" }}
                >
                  {l.label}
                  {pathname === l.href && (
                    <motion.span layoutId="nav-indicator" className="absolute -bottom-1 left-0 right-0 h-px" style={{ background: "#5C6B57" }} />
                  )}
                </motion.span>
              </Link>
            ))}

            {portalLink && (
              <Link href={portalLink.href}>
                <motion.span
                  className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg"
                  style={{ background: "#5C6B57", color: "#F6F4EF", border: "1px solid #5C6B57" }}
                  whileHover={{ background: "#4a5745", boxShadow: "0 0 14px rgba(92,107,87,0.3)" }}
                  whileTap={{ scale: 0.96 }}
                >
                  {portalLink.label}
                </motion.span>
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user && userProfile ? (
              <div className="relative">
                <motion.button
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ border: "1px solid #D4CCBF" }}
                  onClick={() => setProfileOpen(!profileOpen)}
                  whileHover={{ borderColor: "#5C6B57" }}
                >
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} className="w-6 h-6 rounded-full object-cover" alt="avatar" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "#5C6B57", color: "#F6F4EF" }}>
                      {initials}
                    </div>
                  )}
                  <span className="text-sm" style={{ color: "#2C2B29" }}>{userProfile.name?.split(" ")[0]}</span>
                  <ChevronDown size={13} style={{ color: "#4A4845" }} />
                </motion.button>

                {profileOpen && (
                  <motion.div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-2 z-50"
                    style={{ background: "#F6F4EF", border: "1px solid #D4CCBF", boxShadow: "0 16px 40px rgba(44,43,41,0.1)" }}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: "#D4CCBF" }}>
                      <p className="text-xs font-medium" style={{ color: "#2C2B29" }}>{userProfile.name}</p>
                      <p className="text-xs" style={{ color: "#4A4845" }}>{userProfile.email}</p>
                    </div>
                    <Link href="/dashboard" onClick={() => setProfileOpen(false)}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#E8E1D6] transition-colors">
                        <LayoutDashboard size={14} style={{ color: "#5C6B57" }} />
                        <span className="text-sm" style={{ color: "#2C2B29" }}>Dashboard</span>
                      </div>
                    </Link>
                    {(userProfile.role === "admin" || userProfile.role === "mentor") && (
                      <Link href={userProfile.role === "admin" ? "/admin" : "/mentor"} onClick={() => setProfileOpen(false)}>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#E8E1D6] transition-colors">
                          <Shield size={14} style={{ color: "#5C6B57" }} />
                          <span className="text-sm" style={{ color: "#2C2B29" }}>
                            {userProfile.role === "admin" ? "Admin Panel" : "Mentor Portal"}
                          </span>
                        </div>
                      </Link>
                    )}
                    <div className="my-1" style={{ borderTop: "1px solid #D4CCBF" }} />
                    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#E8E1D6] transition-colors" onClick={handleSignOut}>
                      <LogOut size={14} style={{ color: "#4A4845" }} />
                      <span className="text-sm" style={{ color: "#4A4845" }}>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <motion.span className="text-sm tracking-widest uppercase" style={{ color: "#4A4845" }} whileHover={{ color: "#2C2B29" }}>
                    Sign In
                  </motion.span>
                </Link>
                <Link href="/auth/signup">
                  <motion.button
                    className="px-5 py-2.5 text-xs tracking-widest uppercase rounded-xl"
                    style={{ border: "1px solid #5C6B57", color: "#5C6B57", background: "transparent" }}
                    whileHover={{ background: "#5C6B57", color: "#F6F4EF", boxShadow: "0 0 16px rgba(92,107,87,0.2)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Begin
                  </motion.button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" style={{ color: "#2C2B29" }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </motion.header>

      <motion.div
        className="fixed inset-0 z-40 md:hidden"
        initial={{ opacity: 0, x: "100%" }}
        animate={{ opacity: mobileOpen ? 1 : 0, x: mobileOpen ? "0%" : "100%" }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ background: "#F6F4EF" }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: mobileOpen ? 1 : 0, y: mobileOpen ? 0 : 20 }} transition={{ delay: 0.15 }}>
            <span
              className="text-4xl cursor-pointer"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}
              onClick={() => {
                setMobileOpen(false);
                if (pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push(user ? "/?preview=1" : "/");
                }
              }}
            >
              Home
            </span>
          </motion.div>
          {NAV_LINKS.map((l, i) => (
            <motion.div key={l.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: mobileOpen ? 1 : 0, y: mobileOpen ? 0 : 20 }} transition={{ delay: (i + 1) * 0.08 + 0.15 }}>
              <Link href={l.href} onClick={() => setMobileOpen(false)}>
                <span className="text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#2C2B29" }}>{l.label}</span>
              </Link>
            </motion.div>
          ))}
          <div className="flex gap-6 mt-6">
            {portalLink ? (
              <Link href={portalLink.href} onClick={() => setMobileOpen(false)}>
                <span className="text-sm tracking-widest uppercase px-4 py-2 rounded-xl" style={{ border: "1px solid #5C6B57", color: "#5C6B57" }}>
                  {portalLink.label}
                </span>
              </Link>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <span className="text-sm tracking-widest uppercase" style={{ color: "#4A4845" }}>Sign In</span>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                  <span className="text-sm tracking-widest uppercase px-4 py-2 rounded-xl" style={{ border: "1px solid #5C6B57", color: "#5C6B57" }}>Begin</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
