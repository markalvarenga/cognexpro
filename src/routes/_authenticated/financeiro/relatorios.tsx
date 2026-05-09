import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, monthKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro/relatorios")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: txs = [] } = useQuery({
    queryKey: ["rel", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("transactions").select("*")).data ?? [],
  });

  const now = new Date();
  const mk = monthKey(now);
  const mes = txs.filter((t: any) => monthKey(t.date) === mk);

  const byCat = (type: string) => {
    const m = new Map<string, number>();
    mes.filter((t: any) => t.type === type).forEach((t: any) =>
      m.set(t.category ?? "Outros", (m.get(t.category ?? "Outros") ?? 0) + Number(t.amount))
    );
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  };
  const rec = byCat("entrada");
  const des = byCat("saida");

  const exportCsv = () => {
    const rows = [["Data", "Tipo", "Descrição", "Categoria", "Conta", "Valor"]];
    txs.forEach((t: any) => rows.push([t.date, t.type, t.description, t.category ?? "", t.account ?? "", String(t.amount)]));
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `lancamentos-${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <PageHeader title="Relatórios" subtitle="DRE simplificado e exportação"
        actions={<Button onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Receitas por categoria (mês)" rows={rec} tone="success" />
        <Section title="Despesas por categoria (mês)" rows={des} tone="destructive" />
      </div>
    </>
  );
}

function Section({ title, rows, tone }: { title: string; rows: { k: string; v: number }[]; tone: "success" | "destructive" }) {
  const total = rows.reduce((s, r) => s + r.v, 0);
  const colorVar = tone === "success" ? "var(--success)" : "var(--destructive)";
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm font-semibold" style={{ color: colorVar }}>{brl(total)}</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.k}>
            <div className="flex items-center justify-between text-sm">
              <span>{r.k}</span><span className="text-muted-foreground">{brl(r.v)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full" style={{ width: `${total > 0 ? (r.v / total) * 100 : 0}%`, backgroundColor: colorVar }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Sem dados.</div>}
      </div>
    </div>
  );
}
