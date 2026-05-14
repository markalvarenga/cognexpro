// Edge Function: callback OAuth do TikTok Business.
// O `state` enviado na auth URL contém o user_id do app — usamos pra escrever o token correto.
// Token é cifrado via RPC app_encrypt com APP_ENCRYPTION_KEY antes de salvar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TIKTOK_TOKEN_URL =
  "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";

function htmlError(msg: string, status = 400): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>OAuth TikTok</title><body style="font-family:system-ui;padding:40px"><h1>Erro</h1><p>${msg}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") ?? url.searchParams.get("auth_code");
    const state = url.searchParams.get("state"); // user_id do app

    if (!code) return htmlError("Missing code");
    if (!state) return htmlError("Missing state (user_id)");

    const appId = Deno.env.get("TIKTOK_APP_ID");
    const secret = Deno.env.get("TIKTOK_APP_SECRET");
    if (!appId || !secret) return htmlError("TikTok app credentials missing", 500);

    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, secret, auth_code: code }),
    });
    const tokenJson = (await tokenRes.json()) as {
      code: number;
      message?: string;
      data?: { access_token: string; advertiser_ids: string[]; scope?: number[] };
    };

    if (tokenJson.code !== 0 || !tokenJson.data?.access_token) {
      return htmlError(`Token exchange failed: ${tokenJson.message ?? "unknown"}`);
    }

    const { access_token, advertiser_ids } = tokenJson.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const encKey = Deno.env.get("APP_ENCRYPTION_KEY");
    if (!encKey) return htmlError("Encryption key missing", 500);

    const { data: enc, error: encErr } = await supabase.rpc("app_encrypt", {
      plaintext: access_token,
      key: encKey,
    });
    if (encErr) return htmlError(`Encrypt failed: ${encErr.message}`, 500);

    const { error: upErr } = await supabase.from("tiktok_tokens").upsert(
      {
        user_id: state,
        access_token_enc: enc,
        advertiser_ids: advertiser_ids ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upErr) return htmlError(`DB save failed: ${upErr.message}`, 500);

    const appUrl =
      Deno.env.get("APP_URL") ?? `${url.protocol}//${url.host}`.replace(/\/$/, "");
    return Response.redirect(`${appUrl}/tiktok?oauth=success`, 302);
  } catch (e) {
    return htmlError((e as Error).message, 500);
  }
});