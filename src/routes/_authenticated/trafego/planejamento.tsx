import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/trafego/planejamento")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [target, setTarget] = useState("100000");
  const [targetRoas, setTargetRoas] = useState("3");
  const [ticket, setTicket] = useState("197");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-plan", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*")).data ?? [],
  });

  const totals = useMemo(() => {
    return (campaigns as any[]).reduce(
      (acc, c) => {
        acc.spent += Number(c.spent ?? 0);
        acc.revenue += Number(c.revenue ?? 0);
        acc.budget += Number(c.budget ?? 0);
        return acc;
      },
      { spent: 0, revenue: 0, budget: 0 },
    );
  }, [campaigns]);

  const goal = Number(target);
  const roasGoal = Number(targetRoas);
  const avgTicket = Number(ticket);
  const investmentNeeded = roasGoal > 0 ? goal / roasGoal : 0;
  const salesNeeded = avgTicket > 0 ? Math.ceil(goal / avgTicket) : 0;
  const dailyInvestment = investmentNeeded / 30;
  const progress = goal > 0 ? Math.min(100, (totals.revenue / goal) * 100) : 0;

  const byPlatform = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of campaigns as any[]) {
      map.set(c.platform, (map.get(c.platform) ?? 0) + Number(c.spent ?? 0));
    }
    return Array.from(map.entries());
  }, [campaigns]);

  return (
    <>
      <PageHeader title="Planejamento de Mídia" subtitle="Defina metas e calcule investimento necessário" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-3">Parâmetros</h3>
          <div className="space-y-3">
            <div>
              <Label>Meta de receita mensal (R$)</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div>
              <Label>ROAS desejado (x)</Label>
              <Input type="number" step="0.1" value={targetRoas} onChange={(e) => setTargetRoas(e.target.value)} />
            </div>
            <div>
              <Label>Ticket médio (R$)</Label>
              <Input type="number" value={ticket} onChange={(e) => setTicket(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <KPI label="Investimento necessário" value={brl(investmentNeeded)} />
          <KPI label="Investimento diário" value={brl(dailyInvestment)} />
          <KPI label="Vendas necessárias" value={salesNeeded.toLocaleString("pt-BR")} />
          <KPI label="Receita atual" value={brl(totals.revenue)} />

          <div className="col-span-2 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da meta</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {brl(totals.revenue)} de {brl(goal)} · faltam {brl(Math.max(0, goal - totals.revenue))}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mt-4">
        <h3 className="text-sm font-medium mb-3">Distribuição atual por plataforma</h3>
        {byPlatform.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de campanhas.</p>
        ) : (
          <div className="space-y-3">
            {byPlatform.map(([name, spent]) => {
              const pct = totals.spent > 0 ? (spent / totals.spent) * 100 : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-muted-foreground">{brl(spent)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
