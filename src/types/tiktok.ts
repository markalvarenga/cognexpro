// Tipos TypeScript do módulo TikTok

export type CampaignType = "smart_spark" | "smart_catalog" | "manual_cbo" | "manual_abo";

export type LaunchStatus = "pending" | "running" | "success" | "error";

export interface LaunchLog {
  accountId: string;
  accountName: string;
  status: LaunchStatus;
  message: string;
  timestamp: number;
}

export interface TikTokAdAccount {
  id: string;
  user_id: string;
  advertiser_id: string;
  advertiser_name: string | null;
  currency: string;
  proxy: string | null;
  bc_id: string | null;
  status: string;
  created_at: string;
}

export interface BusinessCenter {
  bc_id: string;
  name: string;
}

export interface AdvertiserSummary {
  advertiser_id: string;
  advertiser_name: string;
  currency?: string;
}

export interface SparkIdentity {
  identity_id: string;
  identity_type: string;
  display_name?: string;
  profile_image?: string;
}

export interface PixelInfo {
  pixel_id: string;
  pixel_name: string;
  pixel_code?: string;
  pixel_status?: string;
}

export interface VideoAsset {
  video_id: string;
  video_cover_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  file_name?: string;
  create_time?: string;
}

export interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  objective_type?: string;
  status?: string;
  operation_status?: string;
  budget?: number;
  budget_mode?: string;
  create_time?: string;
  modify_time?: string;
}

/** Resposta padronizada de qualquer chamada TikTok */
export interface TikTokApiResponse<T = unknown> {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
}

export interface ConnectionStatus {
  connected: boolean;
  advertiser_ids: string[];
  bc_id: string | null;
  expires_at: string | null;
  updated_at: string | null;
}