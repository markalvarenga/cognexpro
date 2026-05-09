import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fmtDate } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/operacional/tarefas")({ component: Page });

const STATUS_LABEL: Record<string, string> = {
  todo: "A fazer",
  andamento: "Em andamento",
  revisao: "Em revisão",
  concluido: "Concluído",
};

const PRIO_COLOR: Record<string, string> = {
  urgente: "bg-red-500/15 text-red-500",
  alta: "bg-orange-500/15 text-orange-500",
  media: "bg-blue-500/15 text-blue-500",
  baixa: "bg-muted text-muted-foreground",
};

function Page() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-all", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("tasks").select("*, boards(name,color)").order("due_date", { ascending: true })).data ?? [],
  });

  const filtered = useMemo(
    () =>
      (tasks as any[]).filter(
        (t) =>
          (status === "all" || t.status === status) &&
          (priority === "all" || t.priority === priority) &&
          (!q || t.title.toLowerCase().includes(q.toLowerCase())),
      ),
    [tasks, q, status, priority],
  );

  return (
    <>
      <PageHeader title="Minhas Tarefas" subtitle="Visão consolidada de todos os quadros" />
      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Tarefa</th>
              <th className="text-left px-4 py-3">Quadro</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Prioridade</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="text-left px-4 py-3">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma tarefa</td></tr>
            ) : filtered.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3">
                  {t.boards && (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ background: t.boards.color }} />
                      {t.boards.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{STATUS_LABEL[t.status]}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-[10px] capitalize ${PRIO_COLOR[t.priority]}`}>{t.priority}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(t.due_date)}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.assignee ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
