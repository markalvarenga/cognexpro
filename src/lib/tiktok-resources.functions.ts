// Listagens "leves" usadas por wizards: identities, pixels, vídeos, campanhas.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tt } from "@/server/tiktok/core";
import { requireTikTokToken } from "@/lib/tiktok-auth.functions";
import type {
  CampaignSummary,
  PixelInfo,
  SparkIdentity,
  VideoAsset,
} from "@/types/tiktok";

const AdvertiserInput = z.object({ advertiser_id: z.string().min(1) });

export const listIdentities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        advertiser_id: z.string().min(1),
        identity_type: z
          .enum(["BC_AUTH_TT", "TT_USER", "AUTH_CODE", "CUSTOMIZED_USER"])
          .default("BC_AUTH_TT"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const path = `/identity/get/?advertiser_id=${encodeURIComponent(
      data.advertiser_id,
    )}&identity_type=${data.identity_type}`;
    const res = await tt<{ identity_list: SparkIdentity[] }>({
      method: "GET",
      path,
      token,
    });
    return { items: res.data?.identity_list ?? [] };
  });

export const listPixels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdvertiserInput.parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const res = await tt<{ pixels: PixelInfo[] }>({
      method: "GET",
      path: `/pixel/list/?advertiser_id=${encodeURIComponent(data.advertiser_id)}`,
      token,
    });
    return { items: res.data?.pixels ?? [] };
  });

export const listVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    AdvertiserInput.extend({ page: z.number().int().min(1).max(100).default(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const path = `/file/video/ad/search/?advertiser_id=${encodeURIComponent(
      data.advertiser_id,
    )}&page=${data.page}&page_size=20`;
    const res = await tt<{ list: VideoAsset[] }>({ method: "GET", path, token });
    return { items: res.data?.list ?? [] };
  });

export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdvertiserInput.parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const res = await tt<{ list: CampaignSummary[] }>({
      method: "GET",
      path: `/campaign/get/?advertiser_id=${encodeURIComponent(data.advertiser_id)}`,
      token,
    });
    return { items: res.data?.list ?? [] };
  });

const CampaignActionInput = z.object({
  advertiser_id: z.string().min(1),
  campaign_ids: z.array(z.string().min(1)).min(1).max(50),
});

export const disableCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CampaignActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const res = await tt({
      method: "POST",
      path: "/campaign/status/update/",
      token,
      body: {
        advertiser_id: data.advertiser_id,
        campaign_ids: data.campaign_ids,
        operation_status: "DISABLE",
      },
    });
    return { ok: res.code === 0, message: res.message };
  });

export const deleteCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CampaignActionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { token } = await requireTikTokToken(context.userId);
    const res = await tt({
      method: "POST",
      path: "/campaign/status/update/",
      token,
      body: {
        advertiser_id: data.advertiser_id,
        campaign_ids: data.campaign_ids,
        operation_status: "DELETE",
      },
    });
    return { ok: res.code === 0, message: res.message };
  });