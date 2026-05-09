import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { useMemo } from "react";
import { ImageIcon, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trafego/criativos")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-cre", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*")).data ?? [],
  });

  const ranked = useMemo(() => {
    return [...(campaigns as any[])]
      .map((c) => {
        const spent = Number(c.spent ?? 0);
        const revenue = Number(c.revenue ?? 0);
        const ctr = c.impressions > 0 ? (Number(c.clicks ?? 0) / Number(c.impressions)) * 100 : 0;
        const roas = spent > 0 ? revenue / spent : 0;
        return { ...c, ctr, roas, spent, revenue };
      })
      .sort((a, b) => b.roas - a.roas);
  }, [campaigns]);

  const winners = ranked.filter((c) => c.roas >= 2).slice(0, 6);
  const losers = ranked.filter((c) => c.roas > 0 && c.roas < 1).slice(0, 6);

  return (
    <>
      <PageHeader title="Análise de Criativos" subtitle="Vencedores e perdedores por performance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Criativos vencedores" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} items={winners} tone="emerald" empty="Nenhum criativo com ROAS ≥ 2x ainda." />
        <Section title="Criativos a otimizar" icon={<TrendingDown className="w-4 h-4 text-red-500" />} items={losers} tone="red" empty="Nenhum criativo abaixo de 1x ROAS." />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mt-4">
        <h3 className="text-sm font-medium mb-3">Ranking completo</h3>
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cadastre campanhas para ver a análise.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Criativo / Campanha</th>
                  <th className="text-right py-2">Investido</th>
                  <th className="text-right py-2">Receita</th>
                  <th className="text-right py-2">CTR</th>
                  <th className="text-right py-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 text-right">{brl(c.spent)}</td>
                    <td className="py-2 text-right">{brl(c.revenue)}</td>
                    <td className="py-2 text-right text-muted-foreground">{c.ctr.toFixed(2)}%</td>
                    <td className={`py-2 text-right font-medium ${c.roas >= 2 ? "text-emerald-500" : c.roas >= 1 ? "text-amber-500" : "text-red-500"}`}>{c.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ title, icon, items, tone, empty }: { title: string; icon: React.ReactNode; items: any[]; tone: "emerald" | "red"; empty: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">{icon} {title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.platform} · CTR {c.ctr.toFixed(2)}%</p>
              </div>
              <span className={`text-sm font-semibold ${tone === "emerald" ? "text-emerald-500" : "text-red-500"}`}>{c.roas.toFixed(2)}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
