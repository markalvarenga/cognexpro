import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trafego/campanhas")({ component: Page });

const STATUS_TONE: Record<string, string> = {
  ativa: "bg-emerald-500/15 text-emerald-500",
  pausada: "bg-amber-500/15 text-amber-500",
  encerrada: "bg-muted text-muted-foreground",
};

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(
    () =>
      (campaigns as any[]).filter(
        (c) => (platform === "all" || c.platform === platform) && (status === "all" || c.status === status),
      ),
    [campaigns, platform, status],
  );

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, c) => {
        acc.budget += Number(c.budget ?? 0);
        acc.spent += Number(c.spent ?? 0);
        acc.revenue += Number(c.revenue ?? 0);
        acc.leads += Number(c.leads ?? 0);
        acc.sales += Number(c.sales ?? 0);
        return acc;
      },
      { budget: 0, spent: 0, revenue: 0, leads: 0, sales: 0 },
    );
    return { ...t, roas: t.spent > 0 ? t.revenue / t.spent : 0, cpl: t.leads > 0 ? t.spent / t.leads : 0 };
  }, [filtered]);

  const create = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from("campaigns").insert({ ...p, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <>
      <PageHeader
        title="Campanhas"
        subtitle="Gerencie campanhas e KPIs"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
            </DialogTrigger>
            <CampaignDialog onSubmit={(v) => create.mutate(v)} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Investido" value={brl(totals.spent)} />
        <KPI label="Receita" value={brl(totals.revenue)} />
        <KPI label="ROAS" value={`${totals.roas.toFixed(2)}x`} tone={totals.roas >= 2 ? "text-emerald-500" : "text-amber-500"} />
        <KPI label="CPL médio" value={brl(totals.cpl)} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas plataformas</SelectItem>
            <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
            <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
            <SelectItem value="Outros">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Campanha</th>
              <th className="text-left px-4 py-3">Plataforma</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Budget</th>
              <th className="text-right px-4 py-3">Investido</th>
              <th className="text-right px-4 py-3">Receita</th>
              <th className="text-right px-4 py-3">ROAS</th>
              <th className="text-right px-4 py-3">Leads</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhuma campanha</td></tr>
            ) : filtered.map((c: any) => {
              const roas = Number(c.spent) > 0 ? Number(c.revenue) / Number(c.spent) : 0;
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    {c.product && <div className="text-xs text-muted-foreground">{c.product}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.platform}</td>
                  <td className="px-4 py-3"><Badge className={`text-[10px] capitalize ${STATUS_TONE[c.status]}`}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-right">{brl(c.budget)}</td>
                  <td className="px-4 py-3 text-right">{brl(c.spent)}</td>
                  <td className="px-4 py-3 text-right">{brl(c.revenue)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${roas >= 2 ? "text-emerald-500" : roas > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{roas.toFixed(2)}x</td>
                  <td className="px-4 py-3 text-right">{c.leads ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function CampaignDialog({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("Facebook Ads");
  const [status, setStatus] = useState("ativa");
  const [product, setProduct] = useState("");
  const [manager, setManager] = useState("");
  const [budget, setBudget] = useState("");
  const [spent, setSpent] = useState("");
  const [revenue, setRevenue] = useState("");
  const [leads, setLeads] = useState("");
  const [sales, setSales] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label>Plataforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
              <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Produto</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} /></div>
        <div><Label>Gestor</Label><Input value={manager} onChange={(e) => setManager(e.target.value)} /></div>
        <div><Label>Budget</Label><Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
        <div><Label>Investido</Label><Input type="number" step="0.01" value={spent} onChange={(e) => setSpent(e.target.value)} /></div>
        <div><Label>Receita</Label><Input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
        <div><Label>Leads</Label><Input type="number" value={leads} onChange={(e) => setLeads(e.target.value)} /></div>
        <div><Label>Vendas</Label><Input type="number" value={sales} onChange={(e) => setSales(e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => name && onSubmit({
          name, platform, status, product: product || null, manager: manager || null,
          budget: budget ? Number(budget) : null,
          spent: spent ? Number(spent) : 0,
          revenue: revenue ? Number(revenue) : 0,
          leads: leads ? Number(leads) : 0,
          sales: sales ? Number(sales) : 0,
        })}>Criar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
