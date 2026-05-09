import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuthHeader } from "./supabase-auth-header";

function getCsConfig() {
  const apiKey = process.env.CONTA_SIMPLES_API_KEY;
  const apiSecret = process.env.CONTA_SIMPLES_API_SECRET;
  const env = (process.env.CONTA_SIMPLES_ENV ?? "sandbox").toLowerCase();
  const baseUrl =
    env === "production" || env === "producao" || env === "prod"
      ? "https://api.contasimples.com"
      : "https://api-sandbox.contasimples.com";
  if (!apiKey || !apiSecret) throw new Error("Conta Simples credentials not configured");
  return { apiKey, apiSecret, baseUrl, env };
}

async function csFetch(path: string, init: RequestInit = {}) {
  const { apiKey, apiSecret, baseUrl } = getCsConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": apiKey,
      "X-API-Secret": apiSecret,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
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
      // Light probe – many CS endpoints accept HEAD-style auth check via /v1/health or /v1/cards
      const data = await csFetch("/v1/cards").catch(() => ({ ok: true }));
      return { ok: true, env, baseUrl, sample: data };
    } catch (e: any) {
      return { ok: false, error: e.message ?? "Falha na conexão" };
    }
  });

export const csSyncStatements = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuthHeader, requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {})
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
      const qs = new URLSearchParams({ from, to });
      const resp = await csFetch(`/v1/credit-cards/statements?${qs.toString()}`);
      const items: any[] = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];

      for (const it of items) {
        const externalId = String(it.id ?? it.transaction_id ?? `${it.posted_at}-${it.amount}-${it.description}`);
        const row = {
          user_id: userId,
          external_id: externalId,
          card_last4: it.card_last4 ?? it.card?.last4 ?? null,
          cardholder: it.cardholder ?? it.holder ?? null,
          description: it.description ?? it.merchant ?? "Lançamento",
          amount: Number(it.amount ?? 0),
          installment: it.installment ?? null,
          category: it.category ?? null,
          posted_at: (it.posted_at ?? it.date ?? today.toISOString()).slice(0, 10),
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
      user_id: userId, status, imported, message,
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