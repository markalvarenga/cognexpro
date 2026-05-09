import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/trafego/performance")({ component: Page });

const COLORS = ["#6C63FF", "#22C55E", "#F97316", "#EF4444", "#06B6D4", "#A855F7"];

function Page() {
  const { user } = useAuth();
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-perf", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*")).data ?? [],
  });

  const totals = useMemo(() => {
    return (campaigns as any[]).reduce(
      (acc, c) => {
        acc.spent += Number(c.spent ?? 0);
        acc.revenue += Number(c.revenue ?? 0);
        acc.leads += Number(c.leads ?? 0);
        acc.sales += Number(c.sales ?? 0);
        acc.impressions += Number(c.impressions ?? 0);
        acc.clicks += Number(c.clicks ?? 0);
        return acc;
      },
      { spent: 0, revenue: 0, leads: 0, sales: 0, impressions: 0, clicks: 0 },
    );
  }, [campaigns]);

  const roas = totals.spent > 0 ? totals.revenue / totals.spent : 0;
  const cpl = totals.leads > 0 ? totals.spent / totals.leads : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const convRate = totals.clicks > 0 ? (totals.sales / totals.clicks) * 100 : 0;

  const byPlatform = useMemo(() => {
    const map = new Map<string, { name: string; spent: number; revenue: number }>();
    for (const c of campaigns as any[]) {
      const key = c.platform;
      const cur = map.get(key) ?? { name: key, spent: 0, revenue: 0 };
      cur.spent += Number(c.spent ?? 0);
      cur.revenue += Number(c.revenue ?? 0);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [campaigns]);

  const top = useMemo(
    () =>
      [...(campaigns as any[])]
        .map((c) => ({ name: c.name, roas: Number(c.spent) > 0 ? Number(c.revenue) / Number(c.spent) : 0, spent: Number(c.spent ?? 0) }))
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 5),
    [campaigns],
  );

  return (
    <>
      <PageHeader title="Performance" subtitle="Visão consolidada de tráfego" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Investido" value={brl(totals.spent)} />
        <KPI label="Receita" value={brl(totals.revenue)} />
        <KPI label="ROAS" value={`${roas.toFixed(2)}x`} tone={roas >= 2 ? "text-emerald-500" : "text-amber-500"} />
        <KPI label="CPL" value={brl(cpl)} />
        <KPI label="Impressões" value={totals.impressions.toLocaleString("pt-BR")} />
        <KPI label="Cliques" value={totals.clicks.toLocaleString("pt-BR")} />
        <KPI label="CTR" value={`${ctr.toFixed(2)}%`} />
        <KPI label="Conv." value={`${convRate.toFixed(2)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-3">Investido vs Receita por plataforma</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPlatform}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => brl(v as number)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="spent" name="Investido" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name="Receita" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-3">Distribuição de investimento</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byPlatform} dataKey="spent" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                {byPlatform.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => brl(v as number)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">Top campanhas por ROAS</h3>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma campanha cadastrada</p>
          ) : (
            <div className="space-y-2">
              {top.map((c) => (
                <div key={c.name} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{brl(c.spent)} investido</p>
                  </div>
                  <span className={`text-lg font-semibold ${c.roas >= 2 ? "text-emerald-500" : c.roas > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {c.roas.toFixed(2)}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
