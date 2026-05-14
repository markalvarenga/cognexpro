// Helpers server-only para ler/gravar o access_token cifrado no banco.
// IMPORTANTE: nunca importar de código de cliente.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getKey(): string {
  const k = process.env.APP_ENCRYPTION_KEY;
  if (!k) throw new Error("APP_ENCRYPTION_KEY ausente");
  return k;
}

/** Devolve o access_token em texto puro do usuário, ou null se não conectado. */
export async function getDecryptedToken(userId: string): Promise<{
  token: string;
  advertiserIds: string[];
  bcId: string | null;
} | null> {
  const { data: row, error } = await supabaseAdmin
    .from("tiktok_tokens")
    .select("advertiser_ids, bc_id, access_token_enc")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!row || !row.access_token_enc) return null;

  const { data: dec, error: decErr } = await supabaseAdmin.rpc("app_decrypt", {
    ciphertext: row.access_token_enc,
    key: getKey(),
  });
  if (decErr) throw decErr;
  if (!dec) return null;

  return {
    token: dec as unknown as string,
    advertiserIds: row.advertiser_ids ?? [],
    bcId: row.bc_id ?? null,
  };
}

/** Upsert do token cifrado para o usuário. */
export async function saveEncryptedToken(opts: {
  userId: string;
  accessToken: string;
  advertiserIds: string[];
  expiresAt?: string | null;
}): Promise<void> {
  const { data: enc, error: encErr } = await supabaseAdmin.rpc("app_encrypt", {
    plaintext: opts.accessToken,
    key: getKey(),
  });
  if (encErr) throw encErr;

  const { error } = await supabaseAdmin.from("tiktok_tokens").upsert(
    {
      user_id: opts.userId,
      access_token_enc: enc,
      advertiser_ids: opts.advertiserIds,
      expires_at: opts.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function deleteToken(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tiktok_tokens")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setBcId(userId: string, bcId: string | null): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tiktok_tokens")
    .update({ bc_id: bcId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}