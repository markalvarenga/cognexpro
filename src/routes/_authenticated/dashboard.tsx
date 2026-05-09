import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, monthKey } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet, Target, Activity } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Page });

function Kpi({ icon: Icon, label, value, hint, tone = "default" }: any) {
  const toneCls =
    tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`mt-3 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Page() {
  const { user } = useAuth();

  const { data: txs = [] } = useQuery({
    queryKey: ["dash-tx", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dash-camp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*");
      return data ?? [];
    },
  });

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(lastMonthDate);

  const sumByMonth = (mk: string, type: "entrada" | "saida") =>
    txs.filter((t: any) => monthKey(t.date) === mk && t.type === type)
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const recThis = sumByMonth(thisMonth, "entrada");
  const desThis = sumByMonth(thisMonth, "saida");
  const recLast = sumByMonth(lastMonth, "entrada");
  const lucro = recThis - desThis;
  const margem = recThis > 0 ? (lucro / recThis) * 100 : 0;
  const variacao = recLast > 0 ? ((recThis - recLast) / recLast) * 100 : 0;

  // 6-month series
  const series = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mk = monthKey(d);
    return {
      mes: d.toLocaleDateString("pt-BR", { month: "short" }),
      receita: sumByMonth(mk, "entrada"),
      despesa: sumByMonth(mk, "saida"),
    };
  });

  // Despesas por categoria (mês atual)
  const catMap = new Map<string, number>();
  txs.filter((t: any) => monthKey(t.date) === thisMonth && t.type === "saida")
    .forEach((t: any) => catMap.set(t.category ?? "Outros", (catMap.get(t.category ?? "Outros") ?? 0) + Number(t.amount)));
  const catData = Array.from(catMap, ([name, value]) => ({ name, value }));
  const palette = ["#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6"];

  const totalSpent = campaigns.reduce((s: number, c: any) => s + Number(c.spent ?? 0), 0);
  const totalRevenue = campaigns.reduce((s: number, c: any) => s + Number(c.revenue ?? 0), 0);
  const roas = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão consolidada do seu negócio" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={ArrowUpRight} label="Receita do mês" value={brl(recThis)} tone="up"
          hint={`${variacao >= 0 ? "+" : ""}${variacao.toFixed(1)}% vs mês anterior`} />
        <Kpi icon={ArrowDownRight} label="Despesas do mês" value={brl(desThis)} tone="down" />
        <Kpi icon={TrendingUp} label="Lucro líquido" value={brl(lucro)}
          hint={`Margem ${margem.toFixed(1)}%`} tone={lucro >= 0 ? "up" : "down"} />
        <Kpi icon={Target} label="ROAS médio" value={roas.toFixed(2) + "x"}
          hint={`Investido: ${brl(totalSpent)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Receitas vs Despesas</h3>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success, 145 60% 50%))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success, 145 60% 50%))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: any) => brl(v as number)} />
                <Area type="monotone" dataKey="receita" stroke="#22C55E" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesa" stroke="#EF4444" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Despesas por categoria</h3>
          <div className="h-72">
            {catData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no mês</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {catData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => brl(v as number)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Últimos lançamentos</h3>
          </div>
          <div className="divide-y divide-border">
            {txs.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{t.description}</div>
                  <div className="text-xs text-muted-foreground">{t.category ?? "—"} · {new Date(t.date).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className={t.type === "entrada" ? "text-success font-semibold" : "text-destructive font-semibold"}>
                  {t.type === "entrada" ? "+" : "-"}{brl(t.amount)}
                </div>
              </div>
            ))}
            {txs.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento ainda.</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Activity className="h-4 w-4" /> Campanhas ativas</h3>
          <div className="divide-y divide-border">
            {campaigns.slice(0, 6).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.platform} · {c.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{brl(c.revenue)}</div>
                  <div className="text-xs text-muted-foreground">Gasto: {brl(c.spent)}</div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma campanha cadastrada.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
