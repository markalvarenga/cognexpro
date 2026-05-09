import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Search, CreditCard } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { csSyncStatements, getCsStatements, getCsSyncLog } from "@/lib/conta-simples.functions";

export const Route = createFileRoute("/_authenticated/financeiro/lancamentos")({ component: Page });

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: txs = [] } = useQuery({
    queryKey: ["txs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("*")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("categories").select("*")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("transactions").insert({ ...payload, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["txs"] }); toast.success("Lançamento criado"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["txs"] }); toast.success("Removido"); },
  });

  const filtered = txs.filter((t: any) =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Lançamentos" subtitle="Controle de todas as movimentações financeiras"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo lançamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
              <NewTxForm accounts={accounts} categories={categories} onSubmit={(p) => create.mutate(p)} loading={create.isPending} />
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="saidas">Saídas</TabsTrigger>
          <TabsTrigger value="conta-simples"><CreditCard className="h-3.5 w-3.5 mr-1" /> Conta Simples</TabsTrigger>
        </TabsList>

        {(["todos", "entradas", "saidas"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="bg-card border border-border rounded-xl">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar descrição/categoria..." className="border-0 focus-visible:ring-0 px-0 h-8" />
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Descrição</th>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Conta</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .filter((t: any) => tab === "todos" || (tab === "entradas" ? t.type === "entrada" : t.type === "saida"))
                    .map((t: any) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                        <td className="p-3 text-muted-foreground">{fmtDate(t.date)}</td>
                        <td className="p-3 font-medium">{t.description}</td>
                        <td className="p-3">{t.category ?? "—"}</td>
                        <td className="p-3">{t.account ?? "—"}</td>
                        <td className="p-3"><Badge variant="secondary">{t.status ?? "—"}</Badge></td>
                        <td className={`p-3 text-right font-semibold ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                          {t.type === "entrada" ? "+" : "-"}{brl(t.amount)}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="p-10 text-center text-muted-foreground text-sm">Nenhum lançamento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}

        <TabsContent value="conta-simples" className="mt-4">
          <ContaSimplesPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}

function NewTxForm({ accounts, categories, onSubmit, loading }: any) {
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("");
  const [account, setAccount] = useState<string>("");
  const [status, setStatus] = useState<string>("pendente");

  const cats = categories.filter((c: any) => c.type === (type === "entrada" ? "Receita" : "Despesa"));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mensalidade cliente X" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {cats.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Conta</Label>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a: any) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !description || !amount}
          onClick={() =>
            onSubmit({ type, description, amount: Number(amount), date, category, account, status })
          }
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ContaSimplesPanel() {
  const sync = useServerFn(csSyncStatements);
  const fetchStmts = useServerFn(getCsStatements);
  const fetchLog = useServerFn(getCsSyncLog);

  const stmts = useQuery({ queryKey: ["cs-stmts"], queryFn: () => fetchStmts() });
  const log = useQuery({ queryKey: ["cs-log"], queryFn: () => fetchLog() });

  const m = useMutation({
    mutationFn: () => sync({ data: {} }),
    onSuccess: (r: any) => {
      if (r.status === "ok") toast.success(`${r.imported} lançamentos importados`);
      else toast.error(r.message ?? "Falha ao sincronizar");
      stmts.refetch(); log.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="font-semibold">Sincronização Conta Simples</div>
          <div className="text-sm text-muted-foreground">Importa as faturas do cartão dos últimos 30 dias.</div>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${m.isPending ? "animate-spin" : ""}`} />
          {m.isPending ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-4 py-3 border-b border-border font-semibold">Faturas importadas</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Descrição</th>
              <th className="text-left p-3">Cartão</th>
              <th className="text-left p-3">Portador</th>
              <th className="text-left p-3">Parcela</th>
              <th className="text-right p-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {(stmts.data ?? []).map((s: any) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground">{fmtDate(s.posted_at)}</td>
                <td className="p-3">{s.description}</td>
                <td className="p-3">•••• {s.card_last4 ?? "—"}</td>
                <td className="p-3">{s.cardholder ?? "—"}</td>
                <td className="p-3">{s.installment ?? "—"}</td>
                <td className="p-3 text-right font-semibold text-destructive">-{brl(s.amount)}</td>
              </tr>
            ))}
            {(stmts.data ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Nenhuma fatura importada ainda. Clique em Sincronizar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-4 py-3 border-b border-border font-semibold">Histórico de sincronizações</div>
        <div className="divide-y divide-border">
          {(log.data ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <Badge variant={l.status === "ok" ? "default" : "destructive"}>{l.status}</Badge>
                <span className="ml-3 text-muted-foreground">{new Date(l.ran_at).toLocaleString("pt-BR")}</span>
                {l.message && <span className="ml-3 text-muted-foreground">— {l.message}</span>}
              </div>
              <div className="text-muted-foreground">{l.imported} importados</div>
            </div>
          ))}
          {(log.data ?? []).length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma sincronização ainda.</div>}
        </div>
      </div>
    </div>
  );
}
