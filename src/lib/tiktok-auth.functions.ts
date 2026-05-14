import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  deleteToken,
  getDecryptedToken,
  setBcId as setBcIdServer,
} from "@/server/tiktok/token.server";
import type { ConnectionStatus } from "@/types/tiktok";

const TIKTOK_AUTH_BASE = "https://business-api.tiktok.com/portal/auth";

/** Constrói a URL de autorização do TikTok com state=<user_id>. */
export const getTikTokAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const appId = process.env.TIKTOK_APP_ID;
    const redirect =
      process.env.TIKTOK_REDIRECT_URI ??
      `${process.env.SUPABASE_URL}/functions/v1/tiktok-oauth-callback`;
    if (!appId) throw new Error("TIKTOK_APP_ID ausente");
    if (!redirect || redirect.startsWith("undefined"))
      throw new Error("TIKTOK_REDIRECT_URI / SUPABASE_URL ausente");

    const params = new URLSearchParams({
      app_id: appId,
      state: context.userId,
      redirect_uri: redirect,
    });
    return { url: `${TIKTOK_AUTH_BASE}?${params.toString()}` };
  });

/** Status da conexão atual do usuário (usado pelo dashboard). */
export const getConnectionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConnectionStatus> => {
    const { data, error } = await supabaseAdmin
      .from("tiktok_tokens")
      .select("advertiser_ids, bc_id, expires_at, updated_at, access_token_enc")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.access_token_enc) {
      return {
        connected: false,
        advertiser_ids: [],
        bc_id: null,
        expires_at: null,
        updated_at: null,
      };
    }
    return {
      connected: true,
      advertiser_ids: data.advertiser_ids ?? [],
      bc_id: data.bc_id ?? null,
      expires_at: data.expires_at ?? null,
      updated_at: data.updated_at ?? null,
    };
  });

/** Revoga conexão local (deleta token cifrado). */
export const disconnectTikTok = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await deleteToken(context.userId);
    return { ok: true as const };
  });

/** Define o BC ativo do usuário. */
export const setActiveBc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ bc_id: z.string().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await setBcIdServer(context.userId, data.bc_id);
    return { ok: true as const };
  });

/** Helper interno: garante token e retorna { token, advertiserIds, bcId }. */
export async function requireTikTokToken(userId: string) {
  const t = await getDecryptedToken(userId);
  if (!t) throw new Error("TikTok não conectado. Conecte sua conta antes.");
  return t;
}