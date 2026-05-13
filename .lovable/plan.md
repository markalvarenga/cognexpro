## Fase 6 — Hardening de Segurança (crítico)

O scanner detectou **6 findings de severidade ERROR** que invalidam todo o controle de acesso da Central de Contingência. Antes de seguir construindo, precisamos fechar esses buracos.

### Problemas atuais

1. **Escalação de privilégio** — o trigger `handle_new_user()` dá `role = 'dono'` para **todo** usuário novo. Resultado: `is_admin_or_owner()` retorna `true` para qualquer pessoa logada, e as RLS de `facebook_profiles`, `business_managers`, `ad_accounts`, `facebook_pages`, `pixels`, `tiktok_assets`, `proxies` e `contingency_logs` **não protegem nada**.
2. **Credenciais em texto puro** — `senha_facebook`, `senha_email`, `token_facebook`, `seed_2fa` (perfis), `senha`/`seed_2fa` (TikTok), `usuario_auth`/`senha_auth` (proxies) estão salvos sem criptografia.
3. **`user_roles` sem políticas explícitas de write** — funciona por default-deny, mas não está auditável.

### O que vamos fazer

#### 6.1 — Corrigir o trigger e o modelo de roles (migration)

- Trigger `handle_new_user()` passa a inserir `role = 'operacional'` (least privilege). O **primeiro usuário do sistema** continua ganhando `dono` automaticamente (detecção via `COUNT(*) = 0` em `user_roles`).
- Adicionar políticas explícitas em `user_roles`:
  - `INSERT/UPDATE/DELETE`: somente `service_role` (usuários comuns bloqueados de forma explícita).
  - `SELECT` continua `auth.uid() = user_id`.
- Função `promote_user(target_user_id, new_role)` `SECURITY DEFINER` chamada apenas via server function de admin.
- **Sem rebaixar usuários existentes automaticamente** — apenas novos cadastros ficam restritos. O dono atual decide manualmente quem mantém `dono/admin`.

#### 6.2 — Criptografar credenciais com pgcrypto

- Habilitar extensão `pgcrypto`.
- Criar segredo `APP_ENCRYPTION_KEY` (32 bytes) e função `app.get_encryption_key()` lendo de `vault` (ou GUC server-side).
- Funções helper:
  - `encrypt_secret(plaintext text) returns bytea` — usa `pgp_sym_encrypt`.
  - `decrypt_secret(ciphertext bytea) returns text` — usa `pgp_sym_decrypt`.
- Adicionar colunas `*_encrypted bytea` paralelas às atuais em:
  - `facebook_profiles`: `senha_facebook`, `senha_email`, `token_facebook`, `seed_2fa`
  - `tiktok_assets`: `senha`, `seed_2fa`
  - `proxies`: `senha_auth`
- Migrar dados existentes (cifrar valores atuais) e **dropar as colunas em texto puro**.
- Criar **view** `facebook_profiles_safe`, `tiktok_assets_safe`, `proxies_safe` que devolve as colunas comuns + `has_<segredo> boolean` (nunca o texto). Listagens passam a usar a view.

#### 6.3 — Server functions para revelar/gravar segredos

Toda leitura/gravação de segredo passa por `createServerFn` com `requireSupabaseAuth` + checagem `is_admin_or_owner`:

```
src/lib/contingencia-secrets.functions.ts
  - revealSecret({ entity, id, field })  → retorna texto descriptografado + grava view_secret no log
  - saveSecret({ entity, id, field, value }) → cifra e grava + log
```

Componente `SecretField` deixa de ler direto do Supabase: chama `revealSecret` quando o usuário clica no olho.

#### 6.4 — UI: tela de gerenciar roles (Configurações > Usuários)

A tela já existe, mas hoje só lista. Adicionar:
- Select de role inline (dono/admin/gestor_trafego/financeiro/operacional) — visível só para `dono`.
- Botão "Promover/Rebaixar" chama nova server function `setUserRole({ user_id, role })` (admin-only via service role).
- Aviso visual quando há mais de um `dono` listado.

### Banco de dados

Migration única cobrindo:
1. `CREATE EXTENSION IF NOT EXISTS pgcrypto`
2. Recriar `handle_new_user()` com lógica do "primeiro usuário"
3. Políticas explícitas em `user_roles` (deny insert/update/delete para `authenticated`)
4. Funções `encrypt_secret` / `decrypt_secret`
5. Colunas `*_encrypted` + backfill + drop das colunas plaintext
6. Views `*_safe`
7. Função `set_user_role(target uuid, new_role app_role)` SECURITY DEFINER

### Arquivos a criar/editar

```
supabase/migrations/<timestamp>_security_hardening.sql   (nova)
src/lib/contingencia-secrets.functions.ts                (nova)
src/lib/admin-roles.functions.ts                         (nova)
src/components/contingencia/SecretField.tsx              (refatorar — usar revealSecret)
src/components/contingencia/ContingencyList.tsx          (usar views *_safe)
src/routes/_authenticated/configuracoes/usuarios.tsx     (adicionar UI de role)
```

### Fora do escopo

- Rotação automática de chave de criptografia (envelope encryption).
- Audit log assinado / append-only WORM.
- 2FA real para usuários do app (não confundir com 2FA dos perfis FB).

### Risco / impacto

- **Migration destrutiva**: as colunas plaintext serão removidas após backfill. Dados ficam preservados, mas só acessíveis via `revealSecret`.
- Usuários atualmente com `dono` continuam com `dono` — só novos cadastros são afetados.