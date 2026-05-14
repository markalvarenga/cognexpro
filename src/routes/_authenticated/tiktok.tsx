import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Music2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tiktok")({
  component: TikTokLayout,
});

const TABS = [
  { to: "/tiktok", label: "Dashboard", exact: true },
  { to: "/tiktok/launch", label: "Lançar" },
  { to: "/tiktok/campaigns", label: "Campanhas" },
  { to: "/tiktok/accounts", label: "Contas" },
  { to: "/tiktok/identities", label: "Identities" },
  { to: "/tiktok/pixels", label: "Pixels" },
  { to: "/tiktok/proxies", label: "Proxies" },
  { to: "/tiktok/logs", label: "Logs" },
] as const;

function TikTokLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Music2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">TikTok Ads</h1>
          <p className="text-xs text-muted-foreground">
            Gestão e lançamento em massa de campanhas TikTok Business
          </p>
        </div>
      </div>

      <nav className="border-b border-border flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}