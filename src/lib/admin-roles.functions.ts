import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["dono", "admin", "gestor_trafego", "financeiro", "operacional"] as const;

type RoleRow = { user_id: string; role: typeof ROLES[number] };
type ProfileRow = { user_id: string; full_name: string | null; email: string | null };

async function requireOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "dono")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Apenas donos podem executar esta ação");
}

/** Lista todos os usuários com seus papéis. Apenas dono ou admin. */
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: actorRoles, error: arErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (arErr) throw arErr;
    const roles = (actorRoles ?? []).map((r) => (r as { role: string }).role);
    if (!roles.includes("dono") && !roles.includes("admin")) {
      throw new Error("Sem permissão");
    }

    const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
      supabaseAdmin.from("user_profiles").select("user_id,full_name,email"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;

    const map = new Map<string, { user_id: string; full_name: string | null; email: string | null; roles: string[] }>();
    (profiles as ProfileRow[] | null ?? []).forEach((p) => {
      map.set(p.user_id, { user_id: p.user_id, full_name: p.full_name, email: p.email, roles: [] });
    });
    (roleRows as RoleRow[] | null ?? []).forEach((r) => {
      const cur = map.get(r.user_id);
      if (cur) cur.roles.push(r.role);
      else map.set(r.user_id, { user_id: r.user_id, full_name: null, email: null, roles: [r.role] });
    });
    return { users: Array.from(map.values()) };
  });

const SetRoleInput = z.object({
  target_user_id: z.string().uuid(),
  new_role: z.enum(ROLES),
});

/** Promove ou rebaixa um usuário. Apenas dono. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await requireOwner(userId);

    const { error } = await supabaseAdmin.rpc("set_user_role", {
      _target_user: data.target_user_id,
      _new_role: data.new_role,
      _actor: userId,
    });
    if (error) throw error;
    return { ok: true };
  });