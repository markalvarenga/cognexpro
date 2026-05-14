// Funções server-only do módulo TikTok.
// Toda chamada à TikTok Business API passa por tt() — nunca importar do cliente.

import type { TikTokApiResponse } from "@/types/tiktok";

const TIKTOK_BASE = "https://business-api.tiktok.com/open_api/v1.3";

/** Delay humano log-normal-like; 8% chance de pausa longa. */
export function humanDelay(min: number, max: number): Promise<void> {
  const r = Math.random();
  const delay =
    r < 0.08
      ? max + Math.random() * max * 0.5
      : min + (max - min) * Math.pow(Math.random(), 1.5);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Request ID 18 dígitos (timestamp 13 + sufixo 5) — idempotência. */
export function makeRequestId(): string {
  return (
    Date.now().toString() +
    Math.floor(Math.random() * 99999).toString().padStart(5, "0")
  );
}

function isPermanentError(code: number, msg: string): boolean {
  return (
    [40001, 40002].includes(code) ||
    msg.includes("account banned") ||
    msg.includes("permission denied")
  );
}

interface TtOpts {
  method: "GET" | "POST";
  path: string;
  token: string;
  body?: Record<string, unknown>;
  requestId?: string;
}

async function ttOnce<T>(opts: TtOpts): Promise<TikTokApiResponse<T>> {
  const headers: Record<string, string> = {
    "Access-Token": opts.token,
    "Content-Type": "application/json",
    "User-Agent": "CognexPro/1.0 (+https://cognexpro.com)",
    // NÃO adicionar Origin / Referer / sec-ch-ua / Accept-Language
  };

  const url = `${TIKTOK_BASE}${opts.path}`;
  const body = opts.body ? { ...opts.body, request_id: opts.requestId } : undefined;

  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as TikTokApiResponse<T>;
}

/**
 * Wrapper resiliente. request_id é gerado UMA vez por operação e reutilizado
 * em retries de rede (idempotência). Só regenerado em "does not exist" / "concurrent".
 */
export async function tt<T = unknown>(opts: {
  method: "GET" | "POST";
  path: string;
  token: string;
  body?: Record<string, unknown>;
}): Promise<TikTokApiResponse<T>> {
  let requestId = makeRequestId();
  let attempt = 0;

  while (attempt < 3) {
    const result = await ttOnce<T>({ ...opts, requestId });

    if (result.code === 0) return result;

    const msg = result.message ?? "";

    if (msg.includes("does not exist") || msg.includes("concurrent")) {
      attempt++;
      requestId = makeRequestId(); // regenerar — race de recurso
      await humanDelay(1000, 3000);
      continue;
    }

    if ([40100, 50001, 50002].includes(result.code)) {
      attempt++;
      await humanDelay(2000, 5000); // mesmo request_id
      continue;
    }

    if (isPermanentError(result.code, msg)) {
      throw new Error(`TikTok permanent error ${result.code}: ${msg}`);
    }

    throw new Error(`TikTok error ${result.code}: ${msg}`);
  }

  throw new Error("Max retries exceeded");
}

/** Simula humano olhando dashboard antes de criar campanhas (60% chance). */
export async function exploreNoise(token: string, advertiserId: string): Promise<void> {
  if (Math.random() > 0.6) return;

  const actions: Array<() => Promise<unknown>> = [
    () => tt({ method: "GET", path: `/campaign/get/?advertiser_id=${advertiserId}`, token }),
    () => tt({ method: "GET", path: `/pixel/list/?advertiser_id=${advertiserId}`, token }),
    () =>
      tt({
        method: "GET",
        path: `/identity/get/?advertiser_id=${advertiserId}&identity_type=BC_AUTH_TT`,
        token,
      }),
  ];

  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    try {
      await actions[Math.floor(Math.random() * actions.length)]();
      await humanDelay(500, 1500);
    } catch {
      // ignorar — é só ruído
    }
  }
}

/** Conversão de orçamento — usuário sempre digita em BRL. */
const BRL_TO_CURRENCY: Record<string, number> = {
  BRL: 1,
  USD: 0.18,
  EUR: 0.165,
  MXN: 3.1,
  COP: 730,
  ARS: 185,
  CLP: 165,
  PEN: 0.68,
};

export function convertBudget(brl: number, currency: string): number {
  const rate = BRL_TO_CURRENCY[currency] ?? BRL_TO_CURRENCY.USD;
  return Math.round((brl * rate) / 5) * 5;
}