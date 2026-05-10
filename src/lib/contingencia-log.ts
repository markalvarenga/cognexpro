import { supabase } from "@/integrations/supabase/client";

export type ContingencyAction = "create" | "update" | "delete" | "view_secret";

export async function logAction(
  action: ContingencyAction,
  entity: string,
  entityId?: string | null,
) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("contingency_logs").insert({
      user_id: u.user.id,
      user_email: u.user.email ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
    });
  } catch {
    // silent
  }
}