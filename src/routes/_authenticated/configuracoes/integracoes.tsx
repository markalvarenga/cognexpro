import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { csTestConnection, csSyncStatements, getCsSyncLog } from "@/lib/conta-simples.functions";
import { Plug, RefreshCw, Webhook, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/configuracoes/integracoes")({ component: Page });

type WebhookRow = { id: string; name: string; url: string; event: string; method: string; status: string; created_at: string };
type SyncLog = { id: string; status: string; imported: number | null; message: string | null; ran_at: string };

const EVENTS = ["nova_venda", "campanha_pausada", "alerta_roas", "transacao_criada", "tarefa_concluida"];

function Page() {
  const { user } = useAuth();
  const csTest = useServerFn(csTestConnection);
  const csSync = useServerFn(csSyncStatements);
  const csLogFn = useServerFn(getCsSyncLog);

  const [csState, setCsState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [csMsg, setCsMsg] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [newHook, setNewHook] = useState({ name: "", url: "", event: EVENTS[0], method: "POST" });

  async function loadHooks() {
    const { data } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });
    setHooks((data ?? []) as WebhookRow[]);
  }
  async function loadLogs() {
    try {
      const data = await csLogFn({ data: { limit: 5 } });
      setLogs((data ?? []) as SyncLog[]);
    } catch { /* noop */ }
  }
  useEffect(() => { if (user) { loadHooks(); loadLogs(); } /* eslint-disable-next-line */ }, [user?.id]);

  async function testCs() {
    setCsState("testing"); setCsMsg("");
    try { await csTest({}); setCsState("ok"); setCsMsg("Conexão estabelecida com sucesso."); }
    catch (e) { setCsState("error"); setCsMsg(e instanceof Error ? e.message : "Erro desconhecido"); }
  }
  async function runSync() {
    setSyncing(true);
    try { const r = await csSync({}); toast.success(`Importado: ${r?.imported ?? 0}`); await loadLogs(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha na sincronização"); }
    finally { setSyncing(false); }
  }
  async function addHook() {
    if (!user || !newHook.name || !newHook.url) return toast.error("Preencha nome e URL");
    const { error } = await supabase.from("webhooks").insert({ ...newHook, user_id: user.id });
    if (error) return toast.error(error.message);
    setNewHook({ name: "", url: "", event: EVENTS[0], method: "POST" });
    toast.success("Webhook criado");
    loadHooks();
  }
  async function delHook(id: string) {
    await supabase.from("webhooks").delete().eq("id", id);
    loadHooks();
  }

  return (
    <>
      <PageHeader title="Integrações" subtitle="Conecte plataformas externas e configure webhooks" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Plug className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Conta Simples</h3>
              <p className="text-xs text-muted-foreground">Sincronização de extratos e cartões</p>
            </div>
            {csState === "ok" && <span className="text-[11px] flex items-center gap-1 text-green-500"><CheckCircle2 className="w-3 h-3" /> Conectado</span>}
            {csState === "error" && <span className="text-[11px] flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> Erro</span>}
          </div>
          {csMsg && <p className="text-xs text-muted-foreground mb-3">{csMsg}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={testCs} disabled={csState === "testing"}>
              {csState === "testing" ? "Testando…" : "Testar conexão"}
            </Button>
            <Button size="sm" onClick={runSync} disabled={syncing}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar agora"}
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Últimas execuções</p>
              <ul className="space-y-1.5">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-xs">
                    <span className={l.status === "success" ? "text-green-500" : "text-destructive"}>
                      {l.status === "success" ? "✓" : "✗"} {l.imported ?? 0} item(s)
                    </span>
                    <span className="text-muted-foreground">{formatDistanceToNow(new Date(l.ran_at), { addSuffix: true, locale: ptBR })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-5 opacity-60">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><Plug className="w-5 h-5" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Meta Ads</h3>
              <p className="text-xs text-muted-foreground">Em breve — sincronização de campanhas e métricas</p>
            </div>
          </div>
          <Button size="sm" variant="outline" disabled>Em breve</Button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Webhooks</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-xs">Nome</Label>
            <Input value={newHook.name} onChange={(e) => setNewHook({ ...newHook, name: e.target.value })} placeholder="Ex.: Slack" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">URL</Label>
            <Input value={newHook.url} onChange={(e) => setNewHook({ ...newHook, url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Evento</Label>
            <Select value={newHook.event} onValueChange={(v) => setNewHook({ ...newHook, event: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={addHook} className="w-full">Adicionar</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hooks.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Nenhum webhook configurado.</TableCell></TableRow>
            )}
            {hooks.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell><span className="text-[11px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">{h.event}</span></TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{h.url}</TableCell>
                <TableCell><span className={`text-[11px] ${h.status === "ativo" ? "text-green-500" : "text-muted-foreground"}`}>● {h.status}</span></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delHook(h.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
