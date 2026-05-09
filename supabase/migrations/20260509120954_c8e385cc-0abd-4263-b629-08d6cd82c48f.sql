
-- =====================================================
-- ROLES SYSTEM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('dono', 'admin', 'gestor_trafego', 'financeiro', 'operacional');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('dono','admin'))
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- USER PROFILES
-- =====================================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  username TEXT,
  email TEXT,
  phone TEXT,
  theme_color TEXT DEFAULT '#8B5CF6',
  cursor_personalizado BOOLEAN DEFAULT FALSE,
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_select" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "p_insert" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "p_update" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- COMPANY SETTINGS
-- =====================================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'VIXON DIGITAL LTDA',
  cnpj TEXT DEFAULT '57.577.162/0001-04',
  email TEXT,
  phone TEXT,
  address TEXT,
  sector TEXT,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  fiscal_month_start INTEGER DEFAULT 1,
  week_start TEXT DEFAULT 'monday',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_all" ON public.company_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FINANCEIRO
-- =====================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Conta Corrente','Cartão de Crédito')),
  institution TEXT NOT NULL,
  cpf_cnpj_titular TEXT,
  balance NUMERIC(15,2) DEFAULT 0,
  color TEXT DEFAULT '#6C63FF',
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa','inativa')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_all" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Receita','Despesa')),
  color TEXT DEFAULT '#6C63FF',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_all" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada','saida','transferencia')),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  account TEXT,
  status TEXT CHECK (status IN ('recebido','pago','pendente','agendado')),
  notes TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_all" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- OPERACIONAL (KANBAN)
-- =====================================================
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6C63FF',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "b_all" ON public.boards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','andamento','revisao','concluido')),
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('urgente','alta','media','baixa')),
  due_date DATE,
  assignee TEXT,
  tags TEXT[],
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "t_all" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRÁFEGO PAGO
-- =====================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Facebook Ads','TikTok Ads','Outros')),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','encerrada')),
  product TEXT,
  manager TEXT,
  budget NUMERIC(15,2),
  spent NUMERIC(15,2) DEFAULT 0,
  revenue NUMERIC(15,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  cpl NUMERIC(15,2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_all" ON public.campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CONTINGÊNCIA (admin/dono only)
-- =====================================================
CREATE TABLE public.facebook_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_name TEXT NOT NULL,
  color TEXT DEFAULT '#6C63FF',
  cargo_tipo TEXT,
  email_facebook TEXT,
  senha_facebook TEXT,
  email_vinculado TEXT,
  senha_email TEXT,
  status TEXT DEFAULT 'Ativo',
  token_facebook TEXT,
  id_verificada TEXT,
  email_verificacao TEXT,
  data_nascimento DATE,
  tem_2fa TEXT,
  seed_2fa TEXT,
  instagram_usuario TEXT,
  instagram_conectado_pagina TEXT,
  proxy_id UUID,
  anotacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facebook_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_all" ON public.facebook_profiles FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.business_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_bm TEXT NOT NULL,
  tipo TEXT NOT NULL,
  id_bm TEXT,
  link_acesso TEXT,
  perfil_dono_id UUID REFERENCES public.facebook_profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Ativa',
  bm_administradora_id UUID,
  compartilha_pixel TEXT,
  bms_pixel_compartilhado UUID[],
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.business_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bm_all" ON public.business_managers FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  perfil_id UUID REFERENCES public.facebook_profiles(id) ON DELETE SET NULL,
  bm_anunciante_id UUID REFERENCES public.business_managers(id) ON DELETE SET NULL,
  nome_conta TEXT NOT NULL,
  id_conta TEXT,
  status TEXT DEFAULT 'Ativa',
  limite_diario NUMERIC(15,2),
  limite_total NUMERIC(15,2),
  ultimos_4_digitos TEXT,
  bandeira_cartao TEXT,
  tipo_cartao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aa_all" ON public.ad_accounts FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_pagina TEXT NOT NULL,
  id_pagina TEXT,
  url_pagina TEXT,
  status TEXT DEFAULT 'Ativa',
  tipo_vinculacao TEXT,
  instagram_usuario TEXT,
  bm_acesso_id UUID REFERENCES public.business_managers(id) ON DELETE SET NULL,
  perfil_admin_id UUID REFERENCES public.facebook_profiles(id) ON DELETE SET NULL,
  nivel_acesso TEXT,
  aparece_anuncios TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpg_all" ON public.facebook_pages FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_pixel TEXT NOT NULL,
  id_pixel TEXT,
  bm_dono_id UUID REFERENCES public.business_managers(id) ON DELETE SET NULL,
  dominios TEXT,
  contas_anuncio_ids UUID[],
  bms_com_acesso UUID[],
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "px_all" ON public.pixels FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_id TEXT NOT NULL,
  ip_porta TEXT NOT NULL,
  usuario_auth TEXT,
  senha_auth TEXT,
  tipo TEXT,
  cidade_pais TEXT,
  perfil_id UUID REFERENCES public.facebook_profiles(id) ON DELETE SET NULL,
  provedor TEXT,
  data_vencimento DATE,
  status TEXT DEFAULT 'Ativa',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.proxies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_all" ON public.proxies FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.tiktok_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('Perfil','Business Center','Conta de Anúncio')),
  nome TEXT NOT NULL,
  usuario_tiktok TEXT,
  url_perfil TEXT,
  email_login TEXT,
  senha TEXT,
  tem_2fa TEXT,
  seed_2fa TEXT,
  proxy_id UUID REFERENCES public.proxies(id) ON DELETE SET NULL,
  id_asset TEXT,
  email_acesso TEXT,
  is_dono TEXT,
  nivel_acesso TEXT,
  bc_vinculado_id UUID,
  status TEXT DEFAULT 'Ativo',
  limite_gasto NUMERIC(15,2),
  ultimos_4_digitos TEXT,
  bandeira_cartao TEXT,
  tipo_cartao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tiktok_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tk_all" ON public.tiktok_assets FOR ALL
  USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));

CREATE TABLE public.contingency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contingency_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_select" ON public.contingency_logs FOR SELECT USING (auth.uid() = user_id AND public.is_admin_or_owner(auth.uid()));
CREATE POLICY "cl_insert" ON public.contingency_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CONFIGURAÇÕES
-- =====================================================
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  event TEXT NOT NULL,
  method TEXT DEFAULT 'POST' CHECK (method IN ('POST','GET')),
  headers JSONB,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wh_all" ON public.webhooks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  novas_vendas BOOLEAN DEFAULT TRUE,
  alerta_roas BOOLEAN DEFAULT TRUE,
  alerta_cpa BOOLEAN DEFAULT FALSE,
  relatorio_diario BOOLEAN DEFAULT FALSE,
  meta_atingida BOOLEAN DEFAULT FALSE,
  campanha_pausada BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np_all" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nh_all" ON public.notification_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_company_upd BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_accounts_upd BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_tx_upd BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_tasks_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_camp_upd BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_fp_upd BEFORE UPDATE ON public.facebook_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- AUTO-SEED ON USER CREATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Profile
  INSERT INTO public.user_profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  -- Default role: dono (first user gets dono)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'dono');

  -- Company
  INSERT INTO public.company_settings (user_id) VALUES (NEW.id);

  -- Accounts
  INSERT INTO public.accounts (user_id, name, type, institution, cpf_cnpj_titular, color) VALUES
    (NEW.id, 'Conta Simples', 'Conta Corrente', 'Conta Simples', '57.577.162/0001-04', '#22C55E'),
    (NEW.id, 'Banco Inter', 'Conta Corrente', 'Banco Inter', '117.878.406-11', '#F97316');

  -- Categories
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (NEW.id, 'Produto Digital', 'Receita', '#22C55E'),
    (NEW.id, 'LTV Médio', 'Receita', '#16A34A'),
    (NEW.id, 'Split de Pagamentos', 'Receita', '#15803D'),
    (NEW.id, 'Prestação de Serviço', 'Receita', '#166534'),
    (NEW.id, 'Outros Recebimentos', 'Receita', '#14532D'),
    (NEW.id, 'Tráfego Pago', 'Despesa', '#EF4444'),
    (NEW.id, 'Software', 'Despesa', '#DC2626'),
    (NEW.id, 'Pró-labore', 'Despesa', '#B91C1C'),
    (NEW.id, 'Impostos e Taxas', 'Despesa', '#991B1B'),
    (NEW.id, 'Outros Gastos', 'Despesa', '#7F1D1D');

  -- Default board
  INSERT INTO public.boards (user_id, name) VALUES (NEW.id, 'Geral');

  -- Notification prefs
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
