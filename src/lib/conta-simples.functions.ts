import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuthHeader } from "./supabase-auth-header";

function getCsConfig() {
  const apiKey = process.env.CONTA_SIMPLES_API_KEY;
  const apiSecret = process.env.CONTA_SIMPLES_API_SECRET;
  const env = (process.env.CONTA_SIMPLES_ENV ?? "sandbox").toLowerCase();
  const customBaseUrl = process.env.CONTA_SIMPLES_BASE_URL?.replace(/\/$/, "");
  const baseUrl =
    customBaseUrl ??
    (env === "production" || env === "producao" || env === "prod"
      ? "https://api.contasimples.com"
      : "https://api-sandbox.contasimples.com");
  if (!apiKey || !apiSecret) throw new Error("Conta Simples credentials not configured");
  return { apiKey, apiSecret, baseUrl, env };
}

const USER_AGENT = "Lovable-Conta-Simples-Integration/1.0";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) return tokenCache.token;
  const { apiKey, apiSecret, baseUrl } = getCsConfig();
  const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/oauth/v1/access-token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Conta Simples OAuth ${res.status}: ${text || res.statusText}`);
  }
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 1800) * 1000,
  };
  return tokenCache.token;
}

async function csFetch(path: string, init: RequestInit = {}) {
  const { baseUrl } = getCsConfig();
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(`Conta Simples ${res.status}: ${json?.message ?? text ?? res.statusText}`);
  }
  return json;
}

export const csTestConnection = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuthHeader, requireSupabaseAuth])
  .handler(async () => {
    try {
      const { env, baseUrl } = getCsConfig();
      const token = await getAccessToken();
      return { ok: true, env, baseUrl, tokenPreview: token.slice(0, 12) + "..." };
    } catch (e: any) {
      return { ok: false, error: e.message ?? "Falha na conexão" };
    }
  });

export const csSyncStatements = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuthHeader, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 86400000);
    const from = data.from ?? monthAgo.toISOString().slice(0, 10);
    const to = data.to ?? today.toISOString().slice(0, 10);

    let imported = 0;
    let status = "ok";
    let message = "";
    try {
      const items: any[] = [];
      let nextPageStartKey: string | undefined;
      do {
        const qs = new URLSearchParams({ startDate: from, endDate: to, limit: "100" });
        if (nextPageStartKey) qs.set("nextPageStartKey", nextPageStartKey);
        const resp = await csFetch(`/statements/v1/credit-card?${qs.toString()}`);
        const batch: any[] = Array.isArray(resp?.transactions) ? resp.transactions : [];
        items.push(...batch);
        nextPageStartKey = resp?.nextPageStartKey;
      } while (nextPageStartKey);

      for (const it of items) {
        const externalId = String(it.id ?? `${it.transactionDate}-${it.amountBrl}-${it.merchant}`);
        const masked = it.card?.maskedNumber ?? "";
        const card_last4 = masked ? masked.replace(/\D/g, "").slice(-4) : null;
        const row = {
          user_id: userId,
          external_id: externalId,
          card_last4,
          cardholder: it.card?.responsibleName ?? null,
          description: it.merchant ?? it.type ?? "Lançamento",
          amount: Number(it.amountBrl ?? 0),
          installment: it.installment ?? null,
          category: it.category?.name ?? null,
          posted_at: (it.transactionDate ?? today.toISOString()).slice(0, 10),
          raw: it,
        };
        const { error } = await supabase
          .from("cs_credit_card_statements")
          .upsert(row, { onConflict: "user_id,external_id" });
        if (!error) imported++;
      }
    } catch (e: any) {
      status = "error";
      message = e.message ?? "Erro desconhecido";
    }

    await supabase.from("cs_sync_log").insert({
      user_id: userId,
      status,
      imported,
      message,
    });

    return { status, imported, message, from, to };
  });

export const getCsStatements = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuthHeader, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("cs_credit_card_statements")
      .select("*")
      .eq("user_id", userId)
      .order("posted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCsSyncLog = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuthHeader, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from("cs_sync_log")
      .select("*")
      .eq("user_id", userId)
      .order("ran_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
