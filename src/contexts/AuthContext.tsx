"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile, subscribeUserProfile, seedPrograms } from "@/lib/firestore";
import type { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Holds the last unverified Firebase User so resendVerificationEmail works
  // even after we sign them back out (user state becomes null).
  const lastUnverifiedRef = useRef<User | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    const profile = await getUserProfile(uid);
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    // Handle Google/Apple redirect result (fallback when popup is blocked).
    // Must be called before onAuthStateChanged so the profile is ready when
    // the auth state fires with the redirected user.
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        const existing = await getUserProfile(result.user.uid);
        if (!existing) {
          await createUserProfile(result.user.uid, {
            email: result.user.email ?? "",
            name:  result.user.displayName ?? "Seeker",
            role:  "user",
            photoURL: result.user.photoURL ?? null,
          });
        }
        // onAuthStateChanged below will fire right after and call loadProfile
      })
      .catch(() => { /* no redirect pending — ignore */ });

    let profileUnsub: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down any previous profile subscription
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      setUser(firebaseUser);
      if (firebaseUser) {
        // Do an immediate fetch so the profile is ready for the first render
        await loadProfile(firebaseUser.uid);
        // Then subscribe for real-time updates (enrollment changes, role changes, etc.)
        profileUnsub = subscribeUserProfile(firebaseUser.uid, (profile) => {
          setUserProfile(profile);
        });
        // Seed default programs if not existing
        seedPrograms().catch(() => {});
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, [loadProfile]);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.uid);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Block login for unverified email/password accounts
    if (!result.user.emailVerified) {
      // Stash user before signing out so resendVerificationEmail can still use it
      lastUnverifiedRef.current = result.user;
      await firebaseSignOut(auth);
      throw { code: "auth/email-not-verified" };
    }
    lastUnverifiedRef.current = null;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user);
    await createUserProfile(cred.user.uid, {
      email,
      name,
      role: "user",
      photoURL: null,
    });
    // Do NOT call loadProfile here — the signup page will show "check your inbox"
    // and the user will log in after verifying (triggering onAuthStateChanged then)
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked") {
        // Browser blocked the popup — fall back to redirect flow.
        // getRedirectResult (in the useEffect above) will handle the result.
        await signInWithRedirect(auth, provider);
        return; // page navigates away
      }
      throw err; // re-throw all other errors (popup-closed, unauthorized-domain, …)
    }
    // Popup succeeded — ensure profile exists then load it
    const existing = await getUserProfile(result.user.uid);
    if (!existing) {
      await createUserProfile(result.user.uid, {
        email: result.user.email ?? "",
        name: result.user.displayName ?? "Seeker",
        role: "user",
        photoURL: result.user.photoURL ?? null,
      });
    }
    await loadProfile(result.user.uid);
  };

  const signInWithApple = async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
    const existing = await getUserProfile(result.user.uid);
    if (!existing) {
      await createUserProfile(result.user.uid, {
        email: result.user.email ?? "",
        name: result.user.displayName ?? "Seeker",
        role: "user",
        photoURL: null,
      });
    }
    await loadProfile(result.user.uid);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error("Not authenticated");
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  /** Re-send the Firebase verification email.
   *  Works when user is signed in (verify-email page) AND after the blocked-login
   *  sign-out (login page), because we stash the user in lastUnverifiedRef first. */
  const resendVerificationEmail = async () => {
    const target = user ?? lastUnverifiedRef.current;
    if (target) await sendEmailVerification(target);
  };

  /** Reload the Firebase user to pick up latest emailVerified status.
   *  Call this after the user clicks the link in their inbox. */
  const refreshUser = async () => {
    if (!user) return;
    await user.reload();
    const fresh = auth.currentUser;
    setUser(fresh);
    if (fresh?.emailVerified) await loadProfile(fresh.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user, userProfile, loading,
        signInWithEmail, signUpWithEmail,
        signInWithGoogle, signInWithApple,
        signOut, resetPassword, changePassword, refreshProfile,
        resendVerificationEmail, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
