import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, monthKey } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro/visao-geral")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: txs = [] } = useQuery({
    queryKey: ["all-tx", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")).data ?? [],
  });

  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const mk = monthKey(d);
    const rec = txs.filter((t: any) => monthKey(t.date) === mk && t.type === "entrada").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const des = txs.filter((t: any) => monthKey(t.date) === mk && t.type === "saida").reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { mes: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), receita: rec, despesa: des, lucro: rec - des };
  });

  const totalRec = months.reduce((s, m) => s + m.receita, 0);
  const totalDes = months.reduce((s, m) => s + m.despesa, 0);

  return (
    <>
      <PageHeader title="Visão Geral Financeira" subtitle="Resumo dos últimos 12 meses" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card label="Receita 12m" value={brl(totalRec)} tone="up" />
        <Card label="Despesa 12m" value={brl(totalDes)} tone="down" />
        <Card label="Lucro 12m" value={brl(totalRec - totalDes)} tone={totalRec - totalDes >= 0 ? "up" : "down"} />
      </div>
      <div className="bg-card border border-border rounded-xl p-5 h-96">
        <ResponsiveContainer>
          <BarChart data={months}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => brl(v as number)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="receita" fill="#22C55E" radius={[6,6,0,0]} />
            <Bar dataKey="despesa" fill="#EF4444" radius={[6,6,0,0]} />
            <Bar dataKey="lucro" fill="#8B5CF6" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "up" | "down" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${tone === "up" ? "text-success" : "text-destructive"}`}>{value}</div>
    </div>
  );
}
