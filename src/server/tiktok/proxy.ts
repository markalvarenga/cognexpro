// Proxy sticky-session por advertiser. Server-only.

/** Mesma conta sempre usa o mesmo slot — evita IP hopping. */
export function proxyForAccount(proxies: string[], accountIndex: number): string {
  return proxies[accountIndex % proxies.length];
}

/** Injeta sticky session na string do proxy de acordo com o provider. */
export function stickifyProxy(proxyRaw: string, advertiserId: string): string {
  const session10 = advertiserId.replace(/\D/g, "").slice(-10);
  const hostLower = proxyRaw.toLowerCase();

  if (hostLower.includes("dataimpulse.com")) {
    return proxyRaw.replace(/(:\/\/)([^:]+)/, (_m, proto: string, user: string) => {
      if (user.includes("__")) return `${proto}${user};sessid.${session10}`;
      return `${proto}${user}__sessid.${session10}`;
    });
  }

  if (hostLower.includes("iproyal.com")) {
    const session8 = advertiserId.replace(/\D/g, "").slice(-8).padStart(8, "0");
    return proxyRaw.replace(/(:\/\/[^:]+:)([^@]+)/, (_m, userPart: string, pass: string) => {
      const cleanPass = pass
        .replace(/_session-\w+/g, "")
        .replace(/_lifetime-\w+/g, "");
      return `${userPart}${cleanPass}_session-${session8}_lifetime-30m`;
    });
  }

  // Bright Data / genérico
  return proxyRaw.replace(/(:\/\/)([^:]+)/, (_m, proto: string, user: string) => {
    const clean = user.replace(/-session-s\w+/, "");
    return `${proto}${clean}-session-s${session10}`;
  });
}