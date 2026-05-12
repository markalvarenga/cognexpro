import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Bell, Check, AlertTriangle, TrendingUp, DollarSign, Pause, Target, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/notificacoes")({ component: Page });

type Notif = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  read: boolean;
  created_at: string;
};

type Prefs = {
  push_enabled: boolean;
  novas_vendas: boolean;
  alerta_roas: boolean;
  alerta_cpa: boolean;
  relatorio_diario: boolean;
  meta_atingida: boolean;
  campanha_pausada: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "novas_vendas", label: "Novas vendas", desc: "Notificar a cada venda registrada" },
  { key: "alerta_roas", label: "Alerta de ROAS", desc: "Quando ROAS cair abaixo do limite" },
  { key: "alerta_cpa", label: "Alerta de CPA", desc: "Quando CPA passar do teto" },
  { key: "campanha_pausada", label: "Campanha pausada", desc: "Avisar quando uma campanha for pausada" },
  { key: "meta_atingida", label: "Meta atingida", desc: "Notificar quando uma meta for batida" },
  { key: "relatorio_diario", label: "Relatório diário", desc: "Resumo de performance no fim do dia" },
];

const ICONS: Record<string, typeof Bell> = {
  venda: DollarSign,
  alerta: AlertTriangle,
  performance: TrendingUp,
  pausada: Pause,
  meta: Target,
  relatorio: FileText,
};

function Page() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const [{ data: list }, { data: p }] = await Promise.all([
      supabase.from("notification_history").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setItems((list ?? []) as Notif[]);
    if (p) setPrefs(p as Prefs);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("notif-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_history", filter: `user_id=eq.${user.id}` }, (payload) => {
        setItems((prev) => [payload.new as Notif, ...prev]);
        toast.message((payload.new as Notif).title, { description: (payload.new as Notif).description ?? undefined });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notification_history").update({ read: true }).eq("id", id);
  }
  async function markAllRead() {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notification_history").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }
  async function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notification_history").delete().eq("id", id);
  }
  async function updatePref(key: keyof Prefs, value: boolean) {
    if (!user || !prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase.from("notification_preferences").update({ [key]: value }).eq("user_id", user.id);
  }

  async function seedDemo() {
    if (!user) return;
    await supabase.from("notification_history").insert({
      user_id: user.id,
      type: ["venda", "alerta", "performance", "meta"][Math.floor(Math.random() * 4)],
      title: "Notificação de teste",
      description: "Esta é uma notificação de exemplo gerada manualmente.",
    });
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lidas` : "Tudo em dia"}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={seedDemo}>+ Teste</Button>
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
              <Check className="w-4 h-4 mr-1" /> Marcar todas
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && items.length === 0 && (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma notificação ainda.
            </Card>
          )}
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <Card key={n.id} className={`p-4 flex items-start gap-3 ${!n.read ? "border-primary/40 bg-primary/[0.03]" : ""}`}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(n.id)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(n.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-1">Preferências</h3>
            <p className="text-xs text-muted-foreground mb-4">Escolha o que quer receber.</p>
            <div className="space-y-3">
              {PREF_LABELS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={!!prefs?.[key]}
                    onCheckedChange={(v) => updatePref(key, v)}
                    disabled={!prefs}
                  />
                </div>
              ))}
              <div className="pt-3 mt-3 border-t border-border flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm">Notificações push</p>
                  <p className="text-[11px] text-muted-foreground">Permitir alertas no navegador</p>
                </div>
                <Switch
                  checked={!!prefs?.push_enabled}
                  onCheckedChange={async (v) => {
                    if (v && "Notification" in window) {
                      const perm = await Notification.requestPermission();
                      if (perm !== "granted") {
                        toast.error("Permissão negada pelo navegador");
                        return;
                      }
                    }
                    updatePref("push_enabled", v);
                  }}
                  disabled={!prefs}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
