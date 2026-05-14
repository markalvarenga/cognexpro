// Server functions de lançamento de campanha (Smart+ Spark e Manual CBO/ABO).
// Usa o fluxo definido no CLAUDE.md §3.3 — exploreNoise + delays humanos + retry idempotente via tt().

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { convertBudget, exploreNoise, humanDelay, tt } from "@/server/tiktok/core";
import { requireTikTokToken } from "@/lib/tiktok-auth.functions";

const SmartSparkInput = z.object({
  advertiser_ids: z.array(z.string().min(1)).min(1).max(20),
  currency: z.string().default("BRL"),
  campaign_name: z.string().min(1).max(120),
  budget_brl: z.number().positive().max(100000),
  identity_id: z.string().min(1),
  identity_type: z.enum(["BC_AUTH_TT", "TT_USER", "AUTH_CODE"]).default("BC_AUTH_TT"),
  video_ids: z.array(z.string().min(1)).min(1).max(20),
  pixel_id: z.string().optional(),
  optimization_event: z.string().default("ON_WEB_ORDER"),
  landing_url: z.string().url(),
});

export interface LaunchAccountResult {
  advertiser_id: string;
  ok: boolean;
  campaign_id?: string;
  ads_created: number;
  message?: string;
}

/** Smart+ Spark — lança em N contas (sequencial, com delays humanos). */
export const launchSmart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SmartSparkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const results: LaunchAccountResult[] = [];
    let totalCampaigns = 0;
    let totalAds = 0;

    for (const advertiserId of data.advertiser_ids) {
      const r: LaunchAccountResult = {
        advertiser_id: advertiserId,
        ok: false,
        ads_created: 0,
      };
      try {
        await exploreNoise(token, advertiserId);
        await humanDelay(800, 2000);

        const budget = convertBudget(data.budget_brl, data.currency);

        // 1) Criar campanha
        const camp = await tt<{ campaign_id: string }>({
          method: "POST",
          path: "/campaign/create/",
          token,
          body: {
            advertiser_id: advertiserId,
            campaign_name: data.campaign_name,
            objective_type: "WEB_CONVERSIONS",
            budget_mode: "BUDGET_MODE_DAY",
            budget,
            campaign_type: "REGULAR_CAMPAIGN",
          },
        });
        const campaignId = camp.data?.campaign_id ?? "";
        r.campaign_id = campaignId;
        totalCampaigns++;
        await humanDelay(600, 1500);

        // 2) Criar adgroup (Smart+)
        const ag = await tt<{ adgroup_id: string }>({
          method: "POST",
          path: "/adgroup/create/",
          token,
          body: {
            advertiser_id: advertiserId,
            campaign_id: campaignId,
            adgroup_name: `${data.campaign_name} - AG`,
            promotion_type: "WEBSITE",
            placement_type: "PLACEMENT_TYPE_AUTOMATIC",
            budget_mode: "BUDGET_MODE_DAY",
            budget,
            optimization_goal: "CONVERT",
            optimization_event: data.optimization_event,
            pixel_id: data.pixel_id,
            bid_type: "BID_TYPE_NO_BID",
            billing_event: "OCPM",
            schedule_type: "SCHEDULE_FROM_NOW",
          },
        });
        const adgroupId = ag.data?.adgroup_id ?? "";
        await humanDelay(400, 1000);

        // 3) Criar 1 ad por vídeo (Spark — usa identity)
        for (const videoId of data.video_ids) {
          await tt({
            method: "POST",
            path: "/ad/create/",
            token,
            body: {
              advertiser_id: advertiserId,
              adgroup_id: adgroupId,
              creatives: [
                {
                  ad_name: `${data.campaign_name} - ${videoId.slice(-6)}`,
                  ad_format: "SINGLE_VIDEO",
                  identity_id: data.identity_id,
                  identity_type: data.identity_type,
                  video_id: videoId,
                  landing_page_url: data.landing_url,
                  call_to_action: "ORDER_NOW",
                },
              ],
            },
          });
          r.ads_created++;
          totalAds++;
          await humanDelay(300, 800);
        }

        r.ok = true;
      } catch (e) {
        r.message = (e as Error).message;
      }
      results.push(r);
    }

    // Histórico
    await supabaseAdmin.from("tiktok_launch_history").insert({
      user_id: context.userId,
      campaign_type: "smart_spark",
      accounts_count: data.advertiser_ids.length,
      campaigns_created: totalCampaigns,
      ads_created: totalAds,
      logs: results,
      config: data,
      status: results.every((r) => r.ok) ? "completed" : "partial",
    });

    return { results, totalCampaigns, totalAds };
  });

/** Histórico recente de lançamentos. */
export const listLaunchHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("tiktok_launch_history")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { items: data ?? [] };
  });