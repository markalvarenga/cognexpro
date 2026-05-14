-- TikTok Ads module schema

CREATE TABLE public.tiktok_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token_enc BYTEA,
  advertiser_ids TEXT[] NOT NULL DEFAULT '{}',
  bc_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tiktok_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  advertiser_id TEXT NOT NULL,
  advertiser_name TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  proxy TEXT,
  bc_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, advertiser_id)
);

CREATE TABLE public.tiktok_launch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_type TEXT NOT NULL,
  accounts_count INTEGER NOT NULL DEFAULT 0,
  campaigns_created INTEGER NOT NULL DEFAULT 0,
  ads_created INTEGER NOT NULL DEFAULT 0,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  config JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tiktok_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tiktok_spark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  advertiser_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  display_name TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, advertiser_id, identity_id)
);

ALTER TABLE public.tiktok_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_ad_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_launch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_presets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_spark_profiles ENABLE ROW LEVEL SECURITY;

-- Token: usuário pode SELECT mas não inserir/atualizar/deletar (só server function via service role)
CREATE POLICY tt_tok_select ON public.tiktok_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tt_tok_no_ins ON public.tiktok_tokens FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY tt_tok_no_upd ON public.tiktok_tokens FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY tt_tok_no_del ON public.tiktok_tokens FOR DELETE TO authenticated USING (false);

-- Demais tabelas: dono total dos próprios registros
CREATE POLICY tt_acc_all  ON public.tiktok_ad_accounts    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tt_hist_all ON public.tiktok_launch_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tt_pre_all  ON public.tiktok_presets        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tt_spk_all  ON public.tiktok_spark_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger no tokens
CREATE TRIGGER trg_tt_tokens_updated
  BEFORE UPDATE ON public.tiktok_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tt_acc_user  ON public.tiktok_ad_accounts (user_id);
CREATE INDEX idx_tt_hist_user ON public.tiktok_launch_history (user_id, created_at DESC);
CREATE INDEX idx_tt_spk_user  ON public.tiktok_spark_profiles (user_id, advertiser_id);