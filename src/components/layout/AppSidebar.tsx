import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, DollarSign, ClipboardCheck, TrendingUp, Shield,
  Bell, Settings, ChevronLeft, ChevronRight, Brain, LogOut,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { to: string; label: string }[];
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/financeiro/visao-geral", label: "Financeiro", icon: DollarSign,
    children: [
      { to: "/financeiro/visao-geral", label: "Visão Geral" },
      { to: "/financeiro/lancamentos", label: "Lançamentos" },
      { to: "/financeiro/contas", label: "Contas Bancárias" },
      { to: "/financeiro/fluxo-de-caixa", label: "Fluxo de Caixa" },
      { to: "/financeiro/relatorios", label: "Relatórios" },
    ],
  },
  {
    to: "/operacional/kanban", label: "Operacional", icon: ClipboardCheck,
    children: [
      { to: "/operacional/kanban", label: "Quadros Kanban" },
      { to: "/operacional/tarefas", label: "Minhas Tarefas" },
    ],
  },
  {
    to: "/trafego/campanhas", label: "Tráfego Pago", icon: TrendingUp,
    children: [
      { to: "/trafego/campanhas", label: "Campanhas" },
      { to: "/trafego/performance", label: "Performance" },
      { to: "/trafego/criativos", label: "Análise de Criativos" },
      { to: "/trafego/planejamento", label: "Planejamento de Mídia" },
    ],
  },
  { to: "/contingencia", label: "Central de Contingência", icon: Shield, adminOnly: true },
  {
    to: "/configuracoes/empresa", label: "Configurações", icon: Settings,
    children: [
      { to: "/configuracoes/empresa", label: "Empresa" },
      { to: "/configuracoes/usuarios", label: "Usuários e Permissões" },
      { to: "/configuracoes/integracoes", label: "Integrações" },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, signOut, isAdminOrOwner } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const found = NAV.find((n) => n.children?.some((c) => path.startsWith(c.to)));
    return found?.label ?? null;
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 z-40 ${
        collapsed ? "w-14" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="font-semibold text-sm tracking-tight">COGNEX</span>
            <span className="text-[10px] text-muted-foreground">Segundo Cérebro</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map((item) => {
          if (item.adminOnly && !isAdminOrOwner()) return null;
          const Icon = item.icon;
          const isActive = item.children
            ? item.children.some((c) => path.startsWith(c.to))
            : path.startsWith(item.to);
          const isOpen = openGroup === item.label;

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    if (collapsed) return;
                    setOpenGroup(isOpen ? null : item.label);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-sidebar-accent"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && (
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                    {item.children.map((c) => {
                      const childActive = path === c.to || path.startsWith(c.to + "/");
                      return (
                        <Link
                          key={c.to}
                          to={c.to}
                          className={`block px-2 py-1.5 rounded text-xs transition-colors ${
                            childActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-sidebar-accent"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
        <Link
          to="/notificacoes"
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
            path === "/notificacoes" ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-sidebar-accent"
          }`}
          title={collapsed ? "Notificações" : undefined}
        >
          <Bell className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Notificações</span>}
        </Link>

        <Link
          to="/perfil"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm hover:bg-sidebar-accent"
          title={collapsed ? profile?.full_name ?? user?.email ?? "" : undefined}
        >
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[11px] flex items-center justify-center font-semibold shrink-0">
            {(profile?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          {!collapsed && (
            <span className="truncate text-xs">{profile?.full_name ?? user?.email}</span>
          )}
        </Link>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-foreground/70 hover:bg-sidebar-accent"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>

        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
