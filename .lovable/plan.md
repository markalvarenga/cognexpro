## Fase 4 — Central de Contingência (layout profissional, tabelas enxutas)

Substituir a página placeholder `/contingencia` por uma central completa com 7 abas. **Tabelas minimalistas (só nome + status + ação)**; todos os campos detalhados aparecem apenas no Sheet lateral de criar/editar/visualizar.

### Estrutura de rotas

`src/routes/_authenticated/contingencia.tsx` vira **layout** com `<Outlet />` + tab nav horizontal sticky. Sub-rotas:

```
/contingencia/perfis           → facebook_profiles
/contingencia/bms              → business_managers
/contingencia/contas-anuncio   → ad_accounts
/contingencia/paginas          → facebook_pages
/contingencia/pixels           → pixels
/contingencia/proxies          → proxies
/contingencia/tiktok           → tiktok_assets (sub-tabs por asset_type)
```

`/contingencia` (index) redireciona para `/contingencia/perfis`.

### Layout profissional

```text
┌─────────────────────────────────────────────────────────────┐
│ PageHeader  [busca] [filtro status] [+ Novo]                │
├─────────────────────────────────────────────────────────────┤
│ KPI strip: 3-4 cards compactos (total, ativos, alertas)     │
├──────────────────┬──────────────────────────────────────────┤
│ Lista enxuta     │ Sheet lateral (drawer direito w-[480px]) │
│ • Nome           │  - todos os campos do registro           │
│ • Status badge   │  - credenciais mascaradas com 👁 toggle  │
│ • [⋯ ações]      │  - botões: salvar / excluir              │
└──────────────────┴──────────────────────────────────────────┘
```

- **Tabela** (shadcn Table) com **apenas 3 colunas**: Nome, Status, Ações. Linha inteira clicável → abre o Sheet de detalhes.
- Sheet (`Sheet` shadcn, lado direito) é o **único lugar** onde aparecem todos os campos (IDs, vínculos, credenciais, observações).
- Mesmo Sheet serve para "Novo" (vazio) e "Editar" (preenchido).
- Em `xl+` o Sheet fica fixo lado-a-lado quando há item selecionado; em telas menores vira overlay.

### Componentes compartilhados

```
src/components/contingencia/
  ContingenciaTabs.tsx   — nav horizontal sticky com 7 tabs
  SecretField.tsx        — input mascarado + olho + copiar (re-mascara em 10s; loga view)
  StatusBadge.tsx        — badge colorido por status
  EntitySheet.tsx        — wrapper genérico do Sheet (título, footer salvar/excluir)
  DeleteConfirm.tsx      — AlertDialog confirmação digitando o nome
src/lib/contingencia-log.ts — helper logAction(action, entity, entity_id)
```

### Segurança e auditoria

- Layout `contingencia.tsx` redireciona para `/dashboard` se `!isAdminOrOwner()` (RLS já bloqueia também).
- Toda revelação de senha, criar, editar, excluir grava em `contingency_logs`.
- Senhas mascaradas por padrão; toggle olho com auto re-mascarar em 10s.
- Delete sempre via `DeleteConfirm`.

### Conteúdo de cada Sheet (campos completos)

1. **Perfis** — nome, status, cargo, email/senha FB, email/senha do email, token, 2FA + seed, data nasc, IG, proxy, anotações.
2. **BMs** — nome, ID, tipo, perfil dono, BM administradora, link acesso, pixel compartilhado, observações.
3. **Contas de anúncio** — nome, ID, BM mãe, perfil, tipo/bandeira/últimos 4 do cartão, limites, observações.
4. **Páginas** — nome, ID, URL, BM acesso, perfil admin, IG, nível acesso, tipo vinculação.
5. **Pixels** — nome, ID, BM dono, domínios, multi-select contas/BMs com acesso.
6. **Proxies** — nome/ID, IP:porta, tipo, cidade/país, provedor, vencimento, credenciais auth, perfil vinculado.
7. **TikTok** — sub-tabs (BCs / Anunciantes / Perfis) filtrando `asset_type`. Campos por tipo.

### Banco de dados

Sem novas tabelas — todas existem. Sem migration necessária.

### Arquivos a criar

```
src/routes/_authenticated/contingencia.tsx              (layout + tabs)
src/routes/_authenticated/contingencia/index.tsx        (redirect → perfis)
src/routes/_authenticated/contingencia/perfis.tsx
src/routes/_authenticated/contingencia/bms.tsx
src/routes/_authenticated/contingencia/contas-anuncio.tsx
src/routes/_authenticated/contingencia/paginas.tsx
src/routes/_authenticated/contingencia/pixels.tsx
src/routes/_authenticated/contingencia/proxies.tsx
src/routes/_authenticated/contingencia/tiktok.tsx
src/components/contingencia/*.tsx
src/lib/contingencia-log.ts
```

### Fora do escopo

- Criptografia pgcrypto (fica para fase própria).
- Importação CSV em massa.
