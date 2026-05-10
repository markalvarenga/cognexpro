import { Link, useRouterState } from "@tanstack/react-router";
import { User, Building2, CreditCard, FileText, Crosshair, Globe, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/contingencia/perfis", label: "Perfis", icon: User },
  { to: "/contingencia/bms", label: "BMs", icon: Building2 },
  { to: "/contingencia/contas-anuncio", label: "Contas de Anúncio", icon: CreditCard },
  { to: "/contingencia/paginas", label: "Páginas", icon: FileText },
  { to: "/contingencia/pixels", label: "Pixels", icon: Crosshair },
  { to: "/contingencia/proxies", label: "Proxies", icon: Globe },
  { to: "/contingencia/tiktok", label: "TikTok", icon: Music2 },
];

export function ContingenciaTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="sticky top-0 z-10 -mx-6 px-6 bg-background/80 backdrop-blur border-b border-border mb-6">
      <div className="flex items-center gap-1 overflow-x-auto py-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = path === t.to || path.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}