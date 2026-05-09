# COGNEX — Plano de Construção

Plataforma SaaS de gestão para agência de tráfego pago, com 6 módulos principais (Dashboard, Financeiro, Operacional, Tráfego Pago, Contingência, Configurações), autenticação multi-role e tema personalizável.

## Observações de stack

O template atual é **TanStack Start + Lovable Cloud (Supabase gerenciado)**, não React Router + Supabase puro como pedido no prompt. Vou adaptar mantendo a experiência idêntica:

- Roteamento: TanStack Router (file-based em `src/routes/`) no lugar de React Router. Type-safe, mesmo resultado visual.
- Backend: Lovable Cloud (Supabase por baixo) — habilitarei na primeira fase.
- Demais libs do prompt (Tailwind, shadcn/ui, Recharts, TanStack Query, date-fns, @dnd-kit) entram normalmente.

## Fases de entrega

Dada a dimensão (16 seções, ~15 tabelas, 25+ rotas, Central de Contingência com 7 abas complexas), vou entregar em **fases incrementais**. Cada fase fica funcional antes de seguir.

### Fase 1 — Fundação
- Habilitar Lovable Cloud
- Design system completo em `src/styles.css` (dark, tokens oklch, 7 cores de tema via CSS vars dinâmicas)
- Schema do banco (todas as 15 tabelas + RLS + seed automático no primeiro login via trigger)
- Tabela `user_roles` separada (dono/admin/gestor_trafego/financeiro/operacional) com função `has_role`
- Auth: `/login`, `/register`, `/reset-password`, `/onboarding`
- Layout base: sidebar recolhível (220px ↔ 56px), header de página, proteção de rotas por role
- Provider de tema (aplica `--primary` dinâmico salvo no perfil)

### Fase 2 — Dashboard + Financeiro completo
- `/dashboard` (6 KPIs, 2 gráficos, 2 listas)
- Visão Geral, Lançamentos (CRUD + filtros + modal sync Conta Simples placeholder), Contas Bancárias, Fluxo de Caixa, Relatórios (com export CSV)

### Fase 3 — Operacional + Tráfego Pago
- Kanban com `@dnd-kit/core`, lista de quadros, Minhas Tarefas
- Campanhas (CRUD + KPIs), Performance, Análise de Criativos, Planejamento de Mídia

### Fase 4 — Central de Contingência (7 abas)
- Guard de acesso (apenas dono/admin)
- Perfis, BMs, Contas de Anúncio, Páginas, Pixels, Proxies, TikTok (3 sub-seções)
- Senhas sempre mascaradas com toggle olho, log em `contingency_logs`, confirmação de delete

### Fase 5 — Notificações + Configurações + Perfil
- PWA install prompt, Web Push API, preferências, histórico
- Configurações: Empresa, Usuários (com convite), Integrações (5 abas com modais Meta/TikTok)
- `/perfil`: 2FA toggle, troca senha, cursor personalizado, seletor de cor do tema (7 opções)

## Detalhes técnicos importantes

- **Senhas da Contingência**: armazenadas no Postgres com criptografia via `pgcrypto` (não em texto plano). Decriptação só via RPC server-side autorizada por role.
- **Sincronização Conta Simples**: bloqueada por CORS no browser — entregarei o modal funcional com aviso "disponível via integração server-side" conforme prompt.
- **Web Push real**: requer service worker + VAPID keys; entregarei UI + permissão do browser na Fase 5; push server-side fica como gancho documentado.
- **Multi-tenant**: prompt usa `user_id` direto em todas as tabelas (cada usuário vê seus próprios dados). Mantenho assim — RLS por `auth.uid()`.
- **Onboarding**: cria `company_settings`, contas, categorias e board "Geral" via seed automático.

## Confirmação antes de começar

Esse escopo é grande (~50+ telas). Posso começar pela **Fase 1** agora e seguir incrementando, mostrando progresso ao final de cada fase. Confirma essa abordagem em fases?
