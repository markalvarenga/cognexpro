import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { tt } from "@/server/tiktok/core";
import { requireTikTokToken } from "@/lib/tiktok-auth.functions";
import type { AdvertiserSummary, BusinessCenter } from "@/types/tiktok";

/** Lista Business Centers que o token tem acesso. */
export const listBusinessCenters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const res = await tt<{ list: Array<{ bc_info: { bc_id: string; name: string } }> }>({
      method: "GET",
      path: "/bc/get/",
      token,
    });
    const items: BusinessCenter[] = (res.data?.list ?? []).map((x) => ({
      bc_id: x.bc_info.bc_id,
      name: x.bc_info.name,
    }));
    return { items };
  });

/** Lista Advertisers de um BC. */
export const listAdvertisers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bc_id: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const path = `/bc/advertiser/get/?bc_id=${encodeURIComponent(data.bc_id)}`;
    const res = await tt<{
      list: Array<{ advertiser_id: string; advertiser_name: string; currency?: string }>;
    }>({ method: "GET", path, token });
    const items: AdvertiserSummary[] = res.data?.list ?? [];
    return { items };
  });

/** Sincroniza advertisers conhecidos do token para a tabela tiktok_ad_accounts. */
export const syncAccountsFromToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { token, advertiserIds, bcId } = await requireTikTokToken(context.userId);
    if (advertiserIds.length === 0) return { synced: 0 };

    // Pega info de cada advertiser
    const idsParam = encodeURIComponent(JSON.stringify(advertiserIds));
    const res = await tt<{
      list: Array<{
        advertiser_id: string;
        name?: string;
        currency?: string;
        status?: string;
      }>;
    }>({
      method: "GET",
      path: `/advertiser/info/?advertiser_ids=${idsParam}`,
      token,
    });

    const rows = (res.data?.list ?? []).map((a) => ({
      user_id: context.userId,
      advertiser_id: a.advertiser_id,
      advertiser_name: a.name ?? null,
      currency: a.currency ?? "BRL",
      bc_id: bcId,
      status: a.status ?? "active",
    }));

    if (rows.length === 0) return { synced: 0 };

    const { error } = await supabaseAdmin
      .from("tiktok_ad_accounts")
      .upsert(rows, { onConflict: "user_id,advertiser_id" });
    if (error) throw error;
    return { synced: rows.length };
  });

/** Lista contas salvas localmente. */
export const listLocalAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("tiktok_ad_accounts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { items: data ?? [] };
  });