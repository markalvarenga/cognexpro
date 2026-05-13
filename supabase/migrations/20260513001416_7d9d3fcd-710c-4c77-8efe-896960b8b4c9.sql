
-- 1. Extensão de criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Corrigir trigger handle_new_user: primeiro usuário = dono, demais = operacional
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Profile
  INSERT INTO public.user_profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  -- Primeiro usuário do sistema vira dono; demais entram como operacional
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    v_role := 'dono';
  ELSE
    v_role := 'operacional';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

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

-- 3. Políticas explícitas em user_roles bloqueando writes para usuários comuns
-- (RLS já bloqueia por default-deny mas tornamos explícito e auditável)
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY ur_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY ur_no_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY ur_no_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY ur_no_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (false);

-- 4. Função para promover/rebaixar (somente donos via service role server fn)
CREATE OR REPLACE FUNCTION public.set_user_role(_target_user uuid, _new_role public.app_role, _actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verifica que quem chama é dono
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _actor AND role = 'dono') THEN
    RAISE EXCEPTION 'Apenas donos podem alterar papéis';
  END IF;

  -- Impede que o último dono seja rebaixado
  IF _new_role <> 'dono' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _target_user AND role = 'dono'
  ) THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'dono') <= 1 THEN
      RAISE EXCEPTION 'Não é possível rebaixar o último dono';
    END IF;
  END IF;

  -- Substitui todas as roles do usuário pela nova
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, _new_role);
END;
$$;

-- 5. Helpers de criptografia (chave passada pelo backend, nunca armazenada no DB)
CREATE OR REPLACE FUNCTION public.app_encrypt(plaintext text, key text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT CASE
    WHEN plaintext IS NULL OR plaintext = '' THEN NULL
    ELSE pgp_sym_encrypt(plaintext, key)
  END
$$;

CREATE OR REPLACE FUNCTION public.app_decrypt(ciphertext bytea, key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT CASE
    WHEN ciphertext IS NULL THEN NULL
    ELSE pgp_sym_decrypt(ciphertext, key)
  END
$$;

-- 6. Adicionar colunas cifradas e remover plaintext
-- facebook_profiles
ALTER TABLE public.facebook_profiles
  ADD COLUMN senha_facebook_enc bytea,
  ADD COLUMN senha_email_enc bytea,
  ADD COLUMN token_facebook_enc bytea,
  ADD COLUMN seed_2fa_enc bytea;

ALTER TABLE public.facebook_profiles
  DROP COLUMN senha_facebook,
  DROP COLUMN senha_email,
  DROP COLUMN token_facebook,
  DROP COLUMN seed_2fa;

-- tiktok_assets
ALTER TABLE public.tiktok_assets
  ADD COLUMN senha_enc bytea,
  ADD COLUMN seed_2fa_enc bytea;

ALTER TABLE public.tiktok_assets
  DROP COLUMN senha,
  DROP COLUMN seed_2fa;

-- proxies
ALTER TABLE public.proxies
  ADD COLUMN senha_auth_enc bytea;

ALTER TABLE public.proxies
  DROP COLUMN senha_auth;
