/**
 * Auth store + provider — backed by the local self-hosted Supabase Auth service.
 *
 * Same public surface as before: a tiny external store consumed via
 * `useSyncExternalStore` and `authStore.*` from route guards. All consumers
 * (SiteHeader, login.tsx, routeGuard.ts, …) keep working unchanged.
 *
 * Demo accounts are seeded on demand via the `ensureDemoAccount` helper used
 * by the login page's quick-fill buttons.
 */

import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthSession, AuthUser, LoginInput, RegisterInput, Role } from "@/types/auth";

const HOUR = 60 * 60 * 1000;

/* ---------- store ---------- */

export interface AuthState {
  status: "loading" | "authenticated" | "anonymous";
  session: AuthSession | null;
}

const listeners = new Set<() => void>();
let state: AuthState = { status: "loading", session: null };

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadProfileAndRoles(userId: string, email: string | null): Promise<AuthUser> {
  // get_my_profile() is the only path that returns the user's own telephone,
  // since cross-user reads of email/telephone are blocked at the column level.
  // Wrap in try/catch — a transient RPC/RLS error must NOT cause us to flip
  // the session to anonymous (which would silently log the user out).
  let profile: {
    nom?: string;
    telephone?: string | null;
    caution_validee?: boolean;
    avatar_url?: string | null;
  } | null = null;
  let roleList: Role[] = [];
  try {
    const [{ data: profileRows }, { data: roles }] = await Promise.all([
      supabase.rpc("get_my_profile"),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    profile = Array.isArray(profileRows) ? profileRows[0] : null;
    roleList = (roles ?? []).map((r) => (r as { role: Role }).role);
  } catch (e) {
    console.warn("[auth] profile/roles load failed; using fallbacks", e);
  }
  return {
    id: userId,
    nom: profile?.nom || (email ? email.split("@")[0] : "Utilisateur"),
    email: email ?? "",
    telephone: profile?.telephone ?? undefined,
    roles: roleList.length ? roleList : ["acheteur"],
    cautionValidee: !!profile?.caution_validee,
    avatarUrl: profile?.avatar_url ?? undefined,
  };
}

async function sessionFromSupabase(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s) return null;
  const user = await loadProfileAndRoles(s.user.id, s.user.email ?? null);
  return {
    user,
    token: s.access_token,
    expiresAt: (s.expires_at ?? Math.floor(Date.now() / 1000) + 8 * 3600) * 1000,
  };
}

let initialized = false;
async function ensureInit() {
  if (initialized) return;
  initialized = true;

  // React to identity transitions only. INITIAL_SESSION / TOKEN_REFRESHED fire
  // frequently (tab focus, hourly refresh) — re-running the full profile fetch
  // on them and flipping to anonymous on any transient failure is what was
  // silently logging users out mid-session.
  supabase.auth.onAuthStateChange((event, sbSession) => {
    if (event === "SIGNED_OUT") {
      setState({ status: "anonymous", session: null });
      return;
    }
    if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
    if (!sbSession) return;
    setTimeout(async () => {
      try {
        const session = await sessionFromSupabase();
        if (session) setState({ status: "authenticated", session });
      } catch (e) {
        console.warn("[auth] refresh failed; keeping current session", e);
      }
    }, 0);
  });

  // Hydrate from cached session.
  try {
    const session = await sessionFromSupabase();
    setState(session ? { status: "authenticated", session } : { status: "anonymous", session: null });
  } catch {
    setState({ status: "anonymous", session: null });
  }
}

// Kick off init immediately on module load (browser only).
if (typeof window !== "undefined") {
  void ensureInit();
}

/* ---------- public API ---------- */

export const authStore = {
  getState(): AuthState {
    return state;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async login(input: LoginInput): Promise<AuthSession> {
    let { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    // Local/offline convenience: if a demo credential is typed manually before
    // the demo seeder has run, seed the demo users once and retry the login.
    if (error && DEMO_ACCOUNTS.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
      try {
        await fetch("/api/public/seed-demo", { method: "POST" });
        ({ error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        }));
      } catch {
        // Keep the original auth error below if seeding/retry fails.
      }
    }

    if (error) throw new Error(translateAuthError(error.message));
    const session = await sessionFromSupabase();
    if (!session) throw new Error("Connexion impossible.");
    setState({ status: "authenticated", session });
    return session;
  },
  async register(input: RegisterInput): Promise<AuthSession> {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
        data: {
          nom: input.nom,
          telephone: input.telephone,
          role: input.role,
          actif: true,
        },
      },
    });
    if (error) throw new Error(translateAuthError(error.message));
    // With local auto-confirm, Supabase can issue a session immediately.
    // If not, sign in explicitly so the user can continue offline without an
    // external email confirmation dependency.
    let session = await sessionFromSupabase();
    if (!session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (signInErr) throw new Error(translateAuthError(signInErr.message));
      session = await sessionFromSupabase();
    }
    if (!session) throw new Error("Inscription impossible.");
    setState({ status: "authenticated", session });
    return session;
  },
  logout() {
    // Fire-and-forget — flip UI immediately for snappy UX.
    setState({ status: "anonymous", session: null });
    void supabase.auth.signOut();
  },
  hasRole(role: Role): boolean {
    return state.session?.user.roles.includes(role) ?? false;
  },
  hasAnyRole(roles: Role[]): boolean {
    const userRoles = state.session?.user.roles ?? [];
    return roles.some((r) => userRoles.includes(r));
  },
};

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("user already")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("email not confirmed")) return "Veuillez confirmer votre e-mail avant de vous connecter.";
  if (m.includes("password should")) return "Mot de passe trop court (min 6 caractères).";
  return msg;
}

/* ---------- React hook ---------- */

const SERVER_SNAPSHOT: AuthState = { status: "loading", session: null };

export function useAuth() {
  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    () => SERVER_SNAPSHOT,
  );
  return {
    status: snapshot.status,
    user: snapshot.session?.user ?? null,
    isAuthenticated: snapshot.status === "authenticated",
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    hasRole: (role: Role) => snapshot.session?.user.roles.includes(role) ?? false,
    hasAnyRole: (roles: Role[]) => {
      const userRoles = snapshot.session?.user.roles ?? [];
      return roles.some((r) => userRoles.includes(r));
    },
  };
}

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  expert: "/expert",
  vendeur: "/vendeur",
  acheteur: "/acheteur",
};

/** Demo accounts — created on first use through the seed server route. */
export const DEMO_ACCOUNTS: Array<{ email: string; phone: string; password: string; role: Role; nom: string }> = [
  { email: "admin@bidlic.ma", phone: "+212 600 000 001", password: "Admin1234!", role: "admin", nom: "Admin Bidlic" },
  { email: "expert@bidlic.ma", phone: "+212 600 000 002", password: "Expert1234!", role: "expert", nom: "Youssef El Amrani" },
  { email: "vendeur@bidlic.ma", phone: "+212 600 000 003", password: "Vendeur1234!", role: "vendeur", nom: "Karim Bennani" },
  { email: "acheteur@bidlic.ma", phone: "+212 600 000 004", password: "Acheteur1234!", role: "acheteur", nom: "Salma Idrissi" },
];

// Silence unused HOUR (kept for parity with previous file).
void HOUR;
