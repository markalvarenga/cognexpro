import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro/fluxo-de-caixa")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: txs = [] } = useQuery({
    queryKey: ["fluxo", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*").order("date")).data ?? [],
  });

  const days: { dia: string; saldo: number; entrada: number; saida: number }[] = [];
  let saldo = 0;
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dia = txs.filter((t: any) => t.date === iso);
    const ent = dia.filter((t: any) => t.type === "entrada").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const sai = dia.filter((t: any) => t.type === "saida").reduce((s: number, t: any) => s + Number(t.amount), 0);
    saldo += ent - sai;
    days.push({ dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), saldo, entrada: ent, saida: sai });
  }

  const totalEnt = days.reduce((s, d) => s + d.entrada, 0);
  const totalSai = days.reduce((s, d) => s + d.saida, 0);

  return (
    <>
      <PageHeader title="Fluxo de Caixa" subtitle="Saldo acumulado dos últimos 30 dias" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card label="Entradas (30d)" value={brl(totalEnt)} className="text-success" />
        <Card label="Saídas (30d)" value={brl(totalSai)} className="text-destructive" />
        <Card label="Saldo final" value={brl(saldo)} className={saldo >= 0 ? "text-success" : "text-destructive"} />
      </div>
      <div className="bg-card border border-border rounded-xl p-5 h-96">
        <ResponsiveContainer>
          <LineChart data={days}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => brl(v as number)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="saldo" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function Card({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${className ?? ""}`}>{value}</div>
    </div>
  );
}
