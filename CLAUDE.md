# CLAUDE.md — cognexpro

Este arquivo é lido automaticamente pelo Claude Code (claude.ai/code) ao abrir este repositório.
Contém tudo que o modelo precisa saber para trabalhar no projeto com segurança.

---

## 1. O que é este projeto

**cognexpro** é um SaaS de gestão de campanhas TikTok Ads para agências e anunciantes brasileiros.

Stack atual (não alterar — projeto em desenvolvimento ativo no Lovable):

- **TanStack Start** (full-stack SSR, file-based routing via TanStack Router)
- **React 19** + **TypeScript** + **Tailwind CSS 4**
- **TanStack Query 5** (server state e cache)
- **Radix UI** (componentes — todos já instalados)
- **Supabase** (Postgres + Auth + Edge Functions)
- **Cloudflare Workers** (`@cloudflare/vite-plugin` + `wrangler.jsonc`, entry: `src/server.ts`)
- **Lovable** como plataforma de desenvolvimento (manter dependências `@lovable.dev/*` intactas)
- **Vite 7** via `@lovable.dev/vite-tanstack-config` (não substituir)

> ⚠️ **Não remover nem substituir** `@lovable.dev/cloud-auth-js` nem `@lovable.dev/vite-tanstack-config`.
> A migração para independência do Lovable acontece numa etapa futura, após o SaaS estar completo.

---

## 2. BACKEND — ARQUITETURA

### 2.1 TanStack Start Server Functions (backend nativo)

O backend usa **TanStack Start Server Functions** (`createServerFn`) que rodam no Cloudflare Worker definido em `src/server.ts`. Não há servidor separado.

```ts
// Exemplo de server function
import { createServerFn } from '@tanstack/start'
import { z } from 'zod'

export const listBusinessCenters = createServerFn()
  .validator(z.string())           // token
  .handler(async ({ data: token }) => {
    return tt({ method: 'GET', path: '/bc/get/', token })
  })
```

Server functions são compiladas separadamente e **nunca chegam ao bundle do browser**. Toda lógica sensível (secrets, chamadas TikTok) fica aqui.

### 2.2 Supabase client

```ts
// src/lib/supabase.ts — usar este singleton em todo o projeto
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

Auth já gerenciado pelo Lovable via `@lovable.dev/cloud-auth-js` — não duplicar lógica de sessão.

### 2.3 Estrutura de pastas

```
src/
  routes/                    # Páginas (TanStack Router — file-based)
    __root.tsx
    index.tsx
    tiktok/
      index.tsx              # Dashboard TikTok
      launch.tsx             # Wizard de lançamento
      campaigns.tsx
      accounts.tsx
      identities.tsx
      pixels.tsx
      proxies.tsx
      logs.tsx
    auth/
      tiktok.tsx             # Callback OAuth TikTok
  server/                    # Server functions (nunca vão ao browser)
    tiktok/
      core.ts                # tt(), humanDelay(), makeRequestId(), exploreNoise()
      proxy.ts               # stickifyProxy(), proxyForAccount()
      auth.ts                # exchangeToken(), getAuthUrl()
      bc.ts                  # listBusinessCenters(), listAdvertisers()
      accounts.ts            # createAccount()
      campaigns.ts           # listCampaigns(), disableCampaigns(), deleteCampaigns()
      launch.ts              # launchSmart(), launchManual()
      identity.ts            # listIdentities(), authorizeSparkPost(), getSparkInfo()
      pixel.ts               # listPixels()
      media.ts               # listVideos(), uploadDisplayCard()
  lib/
    supabase.ts              # Cliente Supabase singleton
    api.ts                   # Wrappers tipados para chamar server functions do frontend
  store/
    tiktok.ts                # Zustand store do módulo TikTok
  components/
    tiktok/                  # Componentes do módulo TikTok
  types/
    tiktok.ts                # Tipos TypeScript da integração TikTok
  server.ts                  # Entry point do Cloudflare Worker
```

---

## 3. MÓDULO TIKTOK — BACKEND DETALHADO

### 3.1 Função central `tt()` — TODA chamada TikTok passa por aqui

```ts
// src/server/tiktok/core.ts
const TIKTOK_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

// Delay humano entre operações (log-normal-like, 8% de pausas longas)
export function humanDelay(min: number, max: number): Promise<void> {
  const r = Math.random()
  const delay = r < 0.08
    ? max + Math.random() * max * 0.5
    : min + (max - min) * Math.pow(Math.random(), 1.5)
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Request ID para idempotência: timestamp(13) + sufixo(5) = 18 dígitos
export function makeRequestId(): string {
  return Date.now().toString() + Math.floor(Math.random() * 99999).toString().padStart(5, '0')
}

function isPermanentError(code: number, msg: string): boolean {
  return [40001, 40002].includes(code)
    || msg.includes('account banned')
    || msg.includes('permission denied')
}

async function ttOnce(opts: {
  method: 'GET' | 'POST'
  path: string
  token: string
  body?: object
  requestId?: string
}): Promise<any> {
  const headers: Record<string, string> = {
    'Access-Token': opts.token,
    'Content-Type': 'application/json',
    'User-Agent': 'CognexPro/1.0 (+https://cognexpro.com)',
    // NÃO adicionar Origin, Referer, sec-ch-ua, Accept-Language
    // Esses headers são sinais de "bot se passando por browser" para o TikTok
  }

  const url = `${TIKTOK_BASE}${opts.path}`
  const body = opts.body ? { ...opts.body, request_id: opts.requestId } : undefined

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

// request_id gerado UMA VEZ por operação — reutilizado em retries de rede
// Só regenerar em erro "does not exist" / "concurrent" (race condition de recurso)
export async function tt(opts: {
  method: 'GET' | 'POST'
  path: string
  token: string
  body?: object
}): Promise<any> {
  const requestId = makeRequestId()
  let attempt = 0

  while (attempt < 3) {
    const result = await ttOnce({ ...opts, requestId })

    if (result.code === 0) return result

    const msg = (result.message ?? '') as string

    if (msg.includes('does not exist') || msg.includes('concurrent')) {
      attempt++
      await humanDelay(1000, 3000)
      continue
    }

    if ([40100, 50001, 50002].includes(result.code)) {
      attempt++
      await humanDelay(2000, 5000)
      continue
    }

    if (isPermanentError(result.code, msg)) {
      throw new Error(`TikTok permanent error ${result.code}: ${msg}`)
    }

    throw new Error(`TikTok error ${result.code}: ${msg}`)
  }

  throw new Error('Max retries exceeded')
}

// Simula humano olhando dashboard antes de criar campanhas (60% de chance)
export async function exploreNoise(token: string, advertiserId: string): Promise<void> {
  if (Math.random() > 0.6) return

  const actions = [
    () => tt({ method: 'GET', path: `/campaign/get/?advertiser_id=${advertiserId}`, token }),
    () => tt({ method: 'GET', path: `/pixel/list/?advertiser_id=${advertiserId}`, token }),
    () => tt({ method: 'GET', path: `/identity/get/?advertiser_id=${advertiserId}&identity_type=BC_AUTH_TT`, token }),
  ]

  const count = Math.floor(Math.random() * 2) + 1
  for (let i = 0; i < count; i++) {
    try {
      await actions[Math.floor(Math.random() * actions.length)]()
      await humanDelay(500, 1500)
    } catch { /* ignorar silenciosamente */ }
  }
}

// Conversão de moeda — usuário digita sempre em BRL
const BRL_TO_CURRENCY: Record<string, number> = {
  BRL: 1, USD: 0.18, EUR: 0.165, MXN: 3.1,
  COP: 730, ARS: 185, CLP: 165, PEN: 0.68,
}

export function convertBudget(brl: number, currency: string): number {
  const rate = BRL_TO_CURRENCY[currency] ?? BRL_TO_CURRENCY.USD
  return Math.round((brl * rate) / 5) * 5
}
```

### 3.2 Sistema de proxy sticky session

```ts
// src/server/tiktok/proxy.ts

// Mesma conta sempre usa o mesmo slot de proxy (evita IP hopping)
export function proxyForAccount(proxies: string[], accountIndex: number): string {
  return proxies[accountIndex % proxies.length]
}

// Injeta sticky session — cada provider tem sintaxe diferente
export function stickifyProxy(proxyRaw: string, advertiserId: string): string {
  const session10 = advertiserId.replace(/\D/g, '').slice(-10)
  const hostLower = proxyRaw.toLowerCase()

  if (hostLower.includes('dataimpulse.com')) {
    return proxyRaw.replace(/(:\/\/)([^:]+)/, (_, proto, user) => {
      if (user.includes('__')) return `${proto}${user};sessid.${session10}`
      return `${proto}${user}__sessid.${session10}`
    })
  }

  if (hostLower.includes('iproyal.com')) {
    const session8 = advertiserId.replace(/\D/g, '').slice(-8).padStart(8, '0')
    return proxyRaw.replace(/(:\/\/[^:]+:)([^@]+)/, (_, userPart, pass) => {
      const cleanPass = pass.replace(/_session-\w+/g, '').replace(/_lifetime-\w+/g, '')
      return `${userPart}${cleanPass}_session-${session8}_lifetime-30m`
    })
  }

  // Bright Data / genérico
  return proxyRaw.replace(/(:\/\/)([^:]+)/, (_, proto, user) => {
    const clean = user.replace(/-session-s\w+/, '')
    return `${proto}${clean}-session-s${session10}`
  })
}
```

### 3.3 Fluxo de lançamento Smart+ Spark por conta

```
1. exploreNoise()               — ruído antes de criar
2. humanDelay(800, 2000)        — pausa humana
3. POST /campaign/create/       — criar campanha
4. humanDelay(600, 1500)
5. POST /adgroup/create/        — criar adgroup
6. humanDelay(400, 1000)
7. Para cada vídeo/código:
   a. uploadDisplayCard()       — re-upload por conta (IDs não reutilizáveis entre contas)
   b. POST /ad/create/          — criar ad
   c. humanDelay(300, 800)      — entre ads
```

### 3.4 Identity types TikTok

| Tipo | Descrição |
|---|---|
| `BC_AUTH_TT` | Conta TikTok autorizada via Business Center (Spark padrão) |
| `TT_USER` | Sua própria conta TikTok linkada |
| `AUTH_CODE` | Vídeo de criador via código de autorização |
| `CUSTOMIZED_USER` | Identidade customizada (não é Spark Ad) |

### 3.5 Display Card upload

⚠️ TikTok inverte width/height internamente. Enviar sempre **750×421** para que a API interprete como portrait (421×750). Image IDs **não podem ser reutilizados entre contas** — re-upload obrigatório no loop de lançamento.

---

## 4. OAUTH TIKTOK

### Fluxo

```
Usuário → clica "Conectar TikTok"
→ app gera URL OAuth (getAuthUrl())
→ TikTok mostra tela de permissão
→ redirect para TIKTOK_REDIRECT_URI (Supabase Edge Function)
→ Edge Function troca code por token, salva em tiktok_tokens
→ redirect para /?oauth=success&token=...&advertisers=...
→ App detecta query param, chama useTikTokStore.setToken()
```

### Edge Function: `tiktok-oauth-callback`

Criar em `supabase/functions/tiktok-oauth-callback/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  if (!code) return new Response('Missing code', { status: 400 })

  const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: Deno.env.get('TIKTOK_APP_ID'),
      secret: Deno.env.get('TIKTOK_APP_SECRET'),
      auth_code: code,
    }),
  })
  const tokenData = await tokenRes.json()
  if (tokenData.code !== 0) return new Response('Token exchange failed', { status: 400 })

  const { access_token, advertiser_ids } = tokenData.data

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  await supabase.from('tiktok_tokens').upsert({
    access_token,
    advertiser_ids,
    updated_at: new Date().toISOString(),
  })

  const appUrl = Deno.env.get('APP_URL') ?? 'https://cognexpro.com'
  return Response.redirect(
    `${appUrl}/?oauth=success&token=${access_token}&advertisers=${advertiser_ids.join(',')}`,
    302
  )
})
```

---

## 5. BANCO DE DADOS — SCHEMA SUPABASE

```sql
CREATE TABLE tiktok_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  access_token TEXT NOT NULL,
  advertiser_ids TEXT[] NOT NULL DEFAULT '{}',
  bc_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tiktok_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  advertiser_id TEXT NOT NULL,
  advertiser_name TEXT,
  currency TEXT DEFAULT 'BRL',
  proxy TEXT,
  bc_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, advertiser_id)
);

CREATE TABLE tiktok_launch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  campaign_type TEXT NOT NULL,
  accounts_count INTEGER DEFAULT 0,
  campaigns_created INTEGER DEFAULT 0,
  ads_created INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]',
  config JSONB,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tiktok_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tiktok_spark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  advertiser_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  display_name TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, advertiser_id, identity_id)
);

ALTER TABLE tiktok_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_launch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_spark_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON tiktok_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON tiktok_ad_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON tiktok_launch_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON tiktok_presets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON tiktok_spark_profiles FOR ALL USING (auth.uid() = user_id);
```

---

## 6. ESTADO GLOBAL — ZUSTAND

```ts
// src/store/tiktok.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LaunchLog {
  accountId: string
  accountName: string
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
  timestamp: number
}

export type CampaignType = 'smart_spark' | 'smart_catalog' | 'manual_cbo' | 'manual_abo'

interface TikTokState {
  accessToken: string | null
  bcId: string | null
  advertiserIds: string[]
  connected: boolean
  currentStep: number
  campaignType: CampaignType | null
  selectedAccounts: string[]
  config: Record<string, any>
  isLaunching: boolean
  launchLogs: LaunchLog[]
  launchProgress: number
  setToken: (token: string, advertiserIds: string[]) => void
  setBcId: (bcId: string) => void
  disconnect: () => void
  setStep: (step: number) => void
  setCampaignType: (type: CampaignType) => void
  setSelectedAccounts: (ids: string[]) => void
  updateConfig: (config: Partial<Record<string, any>>) => void
  startLaunch: () => void
  addLog: (log: LaunchLog) => void
  setProgress: (progress: number) => void
  finishLaunch: () => void
  resetWizard: () => void
}

export const useTikTokStore = create<TikTokState>()(
  persist(
    (set) => ({
      accessToken: null, bcId: null, advertiserIds: [], connected: false,
      currentStep: 0, campaignType: null, selectedAccounts: [], config: {},
      isLaunching: false, launchLogs: [], launchProgress: 0,
      setToken: (token, advertiserIds) => set({ accessToken: token, advertiserIds, connected: true }),
      setBcId: (bcId) => set({ bcId }),
      disconnect: () => set({ accessToken: null, bcId: null, advertiserIds: [], connected: false }),
      setStep: (step) => set({ currentStep: step }),
      setCampaignType: (type) => set({ campaignType: type }),
      setSelectedAccounts: (ids) => set({ selectedAccounts: ids }),
      updateConfig: (config) => set((s) => ({ config: { ...s.config, ...config } })),
      startLaunch: () => set({ isLaunching: true, launchLogs: [], launchProgress: 0 }),
      addLog: (log) => set((s) => ({ launchLogs: [...s.launchLogs, log] })),
      setProgress: (progress) => set({ launchProgress: progress }),
      finishLaunch: () => set({ isLaunching: false, launchProgress: 100 }),
      resetWizard: () => set({ currentStep: 0, campaignType: null, selectedAccounts: [], config: {} }),
    }),
    {
      name: 'cognexpro_tiktok',
      partialize: (s) => ({
        accessToken: s.accessToken,
        bcId: s.bcId,
        advertiserIds: s.advertiserIds,
        connected: s.connected,
      }),
    }
  )
)
```

---

## 7. VARIÁVEIS DE AMBIENTE

Adicionar ao `.env`:
```
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
TIKTOK_REDIRECT_URI=https://orupxvhhnrmobselrdvy.supabase.co/functions/v1/tiktok-oauth-callback
APP_URL=https://cognexpro.com
```

Configurar também nos Secrets da Edge Function no Supabase dashboard:
`TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`

---

## 8. COMANDOS

```bash
npm run dev      # Dev server local
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # ESLint
npm run format   # Prettier
```

---

## 9. REFERÊNCIAS

### HawkLaunch (referência principal de implementação TikTok)
- Repo: `https://github.com/vendasonline445-svg/hawklaunch`
- TikTok Campaign Manager completo em produção (230 commits)
- `api/tk.mjs` = referência do backend TikTok (adaptar para TS + server functions)
- CLAUDE.md: `https://github.com/vendasonline445-svg/hawklaunch/blob/main/CLAUDE.md`
- Usa Vercel Serverless — adaptar para TanStack Start server functions

### TikTok Business API SDK (oficial)
- Repo: `https://github.com/tiktok/tiktok-business-api-sdk`
- Referência de payloads e endpoints
- API versão: **v1.3** — `https://business-api.tiktok.com/open_api/v1.3`

---

## 10. REGRAS CRÍTICAS

**Nunca fazer:**
- Chamar `business-api.tiktok.com` diretamente do frontend — sempre via server function
- Adicionar headers de browser nas chamadas TikTok (Origin, Referer, sec-ch-ua, Accept-Language)
- Usar proxies rotativos sem sticky session — IP hopping = sinal de bot
- Regenerar `request_id` em retries de rede — só em errors "does not exist"/"concurrent"
- Reutilizar image IDs de display card entre contas
- Remover dependências `@lovable.dev/*`
- Pular `tt()` para chamar TikTok diretamente

**Regras de código:**
- TypeScript estrito — sem `any`, usar `unknown` + type guards
- Server functions com validators Zod
- Componentes UI: Radix UI + Tailwind (não instalar outras libs de UI)

---

## 11. ORDEM DE IMPLEMENTAÇÃO

1. Schema Supabase — tabelas `tiktok_*`
2. `src/server/tiktok/core.ts` — `tt()`, delays, request_id, noise, conversão de moeda
3. `src/server/tiktok/proxy.ts` — sticky session por provider
4. OAuth — Edge Function callback + rota `/auth/tiktok`
5. Server functions básicas — bc, advertisers, identity, pixel, videos
6. `src/store/tiktok.ts` — Zustand store
7. Dashboard `/tiktok` — status de conexão, cards de contas
8. Páginas de listagem — accounts, identities, pixels, proxies
9. Wizard `/tiktok/launch` — Smart+ Spark + `launchSmart()`
10. Wizard Manual — CBO/ABO + `launchManual()`
11. Bulk + presets — multi-conta, salvar/carregar configurações
12. Logs em tempo real — progresso por conta durante lançamento
13. Gerenciamento — bulk disable/delete, ad review e appeal
