import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Mapping of <entity> → <plaintext-field> → <encrypted-bytea-column>.
 * Only fields registered here can be revealed/saved through this API.
 */
const SECRET_REGISTRY: Record<string, Record<string, string>> = {
  facebook_profiles: {
    senha_facebook: "senha_facebook_enc",
    senha_email: "senha_email_enc",
    token_facebook: "token_facebook_enc",
    seed_2fa: "seed_2fa_enc",
  },
  tiktok_assets: {
    senha: "senha_enc",
    seed_2fa: "seed_2fa_enc",
  },
  proxies: {
    senha_auth: "senha_auth_enc",
  },
};

function getEncColumn(entity: string, field: string): string {
  const col = SECRET_REGISTRY[entity]?.[field];
  if (!col) throw new Error(`Campo de segredo não permitido: ${entity}.${field}`);
  return col;
}

function getKey(): string {
  const k = process.env.APP_ENCRYPTION_KEY;
  if (!k) throw new Error("APP_ENCRYPTION_KEY não configurada");
  return k;
}

async function ensureOwnership(entity: string, id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from(entity)
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Registro não encontrado");
  if ((data as { user_id: string }).user_id !== userId) {
    throw new Error("Sem permissão para este registro");
  }
}

async function logSecretAction(
  userId: string,
  userEmail: string | null,
  action: string,
  entity: string,
  entityId: string | null,
) {
  await supabaseAdmin.from("contingency_logs").insert({
    user_id: userId,
    user_email: userEmail,
    action,
    entity,
    entity_id: entityId,
  });
}

const RevealInput = z.object({
  entity: z.string().min(1).max(64),
  id: z.string().uuid(),
  field: z.string().min(1).max(64),
});

export const revealSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevealInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const encCol = getEncColumn(data.entity, data.field);
    await ensureOwnership(data.entity, data.id, userId);

    const { data: row, error } = await supabaseAdmin
      .from(data.entity)
      .select(encCol)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    const cipher = row ? (row as Record<string, unknown>)[encCol] : null;
    if (cipher == null) {
      return { value: "" };
    }

    const { data: dec, error: decErr } = await supabaseAdmin.rpc("app_decrypt", {
      ciphertext: cipher as never,
      key: getKey(),
    });
    if (decErr) throw decErr;

    await logSecretAction(
      userId,
      (claims as { email?: string } | null)?.email ?? null,
      "view_secret",
      data.entity,
      data.id,
    );
    return { value: (dec as string | null) ?? "" };
  });

const SaveInput = z.object({
  entity: z.string().min(1).max(64),
  id: z.string().uuid(),
  field: z.string().min(1).max(64),
  value: z.string().max(8192),
});

export const saveSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const encCol = getEncColumn(data.entity, data.field);
    await ensureOwnership(data.entity, data.id, userId);

    let cipher: string | null = null;
    if (data.value && data.value.length > 0) {
      const { data: enc, error: encErr } = await supabaseAdmin.rpc("app_encrypt", {
        plaintext: data.value,
        key: getKey(),
      });
      if (encErr) throw encErr;
      cipher = enc as unknown as string;
    }

    const { error } = await supabaseAdmin
      .from(data.entity)
      .update({ [encCol]: cipher })
      .eq("id", data.id);
    if (error) throw error;

    await logSecretAction(
      userId,
      (claims as { email?: string } | null)?.email ?? null,
      "update_secret",
      data.entity,
      data.id,
    );
    return { ok: true };
  });

/** Returns which secret fields have a value stored (without revealing). */
const HasInput = z.object({
  entity: z.string().min(1).max(64),
  id: z.string().uuid(),
});

export const listSecretFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HasInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const map = SECRET_REGISTRY[data.entity];
    if (!map) return { flags: {} };
    await ensureOwnership(data.entity, data.id, userId);
    const cols = Object.values(map);
    const { data: row, error } = await supabaseAdmin
      .from(data.entity)
      .select(cols.join(","))
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    const flags: Record<string, boolean> = {};
    for (const [field, col] of Object.entries(map)) {
      flags[field] = !!(row && (row as Record<string, unknown>)[col]);
    }
    return { flags };
  });