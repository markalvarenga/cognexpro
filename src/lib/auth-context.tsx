import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyThemeColor } from "./theme";

export type AppRole = "dono" | "admin" | "gestor_trafego" | "financeiro" | "operacional";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name?: string | null; username?: string | null; theme_color?: string | null; onboarding_completed?: boolean | null } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  isAdminOrOwner: () => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthCtx["profile"]>(null);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("user_profiles").select("full_name,username,theme_color,onboarding_completed").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof ?? null);
    setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
    if (prof?.theme_color) applyThemeColor(prof.theme_color);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    session,
    loading,
    roles,
    profile,
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: async () => { if (user) await loadProfile(user.id); },
    hasRole: (r) => roles.includes(r),
    isAdminOrOwner: () => roles.includes("dono") || roles.includes("admin"),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
