import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Search, Trash2, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { logAction } from "@/lib/contingencia-log";
import { StatusBadge } from "./StatusBadge";
import { SecretField } from "./SecretField";
import { DeleteConfirm } from "./DeleteConfirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useServerFn } from "@tanstack/react-start";
import { saveSecret, listSecretFlags } from "@/lib/contingencia-secrets.functions";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "secret" | "select" | "date" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Group label in the form (Sheet) */
  group?: string;
  /** Hide in the form */
  hidden?: boolean;
};

export type ContingencyListProps = {
  table: string;
  entity: string;
  title: string;
  subtitle: string;
  /** Column for the visible "name" */
  nameField: string;
  /** Column for the status (defaults to "status") */
  statusField?: string;
  fields: FieldDef[];
  /** Optional extra filter (e.g. { asset_type: "BC" }) */
  baseFilter?: Record<string, string>;
  /** Defaults applied when creating */
  defaults?: Record<string, unknown>;
};

type Row = Record<string, unknown> & { id: string };

export function ContingencyList(props: ContingencyListProps) {
  const { table, entity, title, subtitle, nameField, fields, baseFilter, defaults } = props;
  const statusField = props.statusField ?? "status";
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [secretFlags, setSecretFlags] = useState<Record<string, boolean>>({});
  const saveSecretFn = useServerFn(saveSecret);
  const listFlagsFn = useServerFn(listSecretFlags);

  const queryKey = ["cont", table, baseFilter];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from(table as never).select("*").order("created_at", { ascending: false });
      if (baseFilter) {
        for (const [k, v] of Object.entries(baseFilter)) q = (q as never as { eq: (k: string, v: unknown) => typeof q }).eq(k, v);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !String(r[nameField] ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "todos" && String(r[statusField] ?? "").toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, nameField, statusField]);

  const stats = useMemo(() => {
    const total = rows.length;
    const ativos = rows.filter((r) => /ativ/i.test(String(r[statusField] ?? ""))).length;
    const alertas = rows.filter((r) => /banid|bloque|venc|pausad/i.test(String(r[statusField] ?? ""))).length;
    return { total, ativos, alertas };
  }, [rows, statusField]);

  const secretFields = useMemo(() => fields.filter((f) => f.type === "secret"), [fields]);

  const openNew = () => {
    setSelected(null);
    setDraft({ ...(defaults ?? {}), ...(baseFilter ?? {}) });
    setSecretFlags({});
    setOpen(true);
  };

  const openEdit = async (r: Row) => {
    setSelected(r);
    // Strip any *_enc bytea blobs that came from select(*)
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (k.endsWith("_enc")) continue;
      cleaned[k] = v;
    }
    // Clear secret fields so user has to reveal explicitly
    for (const f of secretFields) cleaned[f.key] = "";
    setDraft(cleaned);
    setSecretFlags({});
    setOpen(true);
    if (secretFields.length > 0) {
      try {
        const { flags } = await listFlagsFn({ data: { entity, id: r.id } });
        setSecretFlags(flags);
      } catch {
        // silently — user just won't see the placeholder
      }
    }
  };

  const saveMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error("not authed");
      const clean: Record<string, unknown> = { ...payload };
      // Extract secrets and remove from main payload (handled separately)
      const secrets: Record<string, string> = {};
      for (const f of secretFields) {
        const v = clean[f.key];
        if (typeof v === "string" && v.length > 0) secrets[f.key] = v;
        delete clean[f.key];
      }
      // strip id when inserting
      const isUpdate = !!selected;
      let rowId: string;
      if (!isUpdate) {
        delete clean.id;
        delete clean.created_at;
        clean.user_id = user.id;
      } else {
        delete clean.created_at;
        delete clean.id;
      }
      // normalize empty strings to null
      for (const k of Object.keys(clean)) {
        if (clean[k] === "") clean[k] = null;
      }
      if (isUpdate) {
        const { error } = await supabase.from(table as never).update(clean as never).eq("id", selected!.id);
        if (error) throw error;
        rowId = selected!.id;
        await logAction("update", entity, selected!.id);
      } else {
        const { data, error } = await supabase.from(table as never).insert(clean as never).select("id").single();
        if (error) throw error;
        rowId = (data as { id: string } | null)?.id ?? "";
        await logAction("create", entity, rowId);
      }
      // Persist secrets via server fn (encrypts server-side)
      for (const [field, value] of Object.entries(secrets)) {
        if (!rowId) break;
        await saveSecretFn({ data: { entity, id: rowId, field, value } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(selected ? "Atualizado" : "Criado");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase.from(table as never).delete().eq("id", selected.id);
      if (error) throw error;
      await logAction("delete", entity, selected.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Excluído");
      setDeleteOpen(false);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = useMemo(() => {
    const g: Record<string, FieldDef[]> = {};
    for (const f of fields) {
      if (f.hidden) continue;
      const k = f.group ?? "Geral";
      (g[k] ||= []).push(f);
    }
    return g;
  }, [fields]);

  const getName = (r: Row | null) => (r ? String(r[nameField] ?? "—") : "");

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold mt-0.5">{stats.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Ativos</div>
          <div className="text-2xl font-semibold mt-0.5 text-emerald-400">{stats.ativos}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Alertas</div>
          <div className="text-2xl font-semibold mt-0.5 text-amber-400">{stats.alertas}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pelo nome..." className="pl-8 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="banido">Banido</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-12">
                Nenhum registro. Clique em <span className="text-foreground font-medium">Novo</span> para criar.
              </TableCell></TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-accent/40" onClick={() => openEdit(r)}>
                <TableCell className="font-medium">{getName(r)}</TableCell>
                <TableCell><StatusBadge status={r[statusField] as string | undefined} /></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setSelected(r); setDeleteOpen(true); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected ? `Editar: ${getName(selected)}` : `Novo registro`}</SheetTitle>
          </SheetHeader>

          <form
            className="py-4 space-y-6"
            onSubmit={(e) => { e.preventDefault(); saveMut.mutate(draft); }}
          >
            {Object.entries(groups).map(([groupName, fs]) => (
              <div key={groupName} className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  {groupName}
                </div>
                {fs.map((f) => {
                  const v = (draft[f.key] as string | number | null | undefined) ?? "";
                  const setV = (val: unknown) => setDraft((d) => ({ ...d, [f.key]: val }));
                  if (f.type === "secret") {
                    return (
                      <SecretField
                        key={f.key}
                        label={f.label}
                        field={f.key}
                        value={String(v ?? "")}
                        onChange={setV}
                        entity={entity}
                        entityId={selected?.id}
                        placeholder={f.placeholder}
                        hasStored={!!secretFlags[f.key]}
                      />
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Textarea value={String(v ?? "")} onChange={(e) => setV(e.target.value)} placeholder={f.placeholder} rows={3} />
                      </div>
                    );
                  }
                  if (f.type === "select" && f.options) {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Select value={String(v ?? "")} onValueChange={(val) => setV(val)}>
                          <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Selecione..."} /></SelectTrigger>
                          <SelectContent>
                            {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <Input
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        value={String(v ?? "")}
                        onChange={(e) => setV(f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                        placeholder={f.placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            <SheetFooter className="gap-2 pt-2">
              {selected && (
                <Button type="button" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Salvando..." : "Salvar"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <DeleteConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={getName(selected)}
        onConfirm={() => deleteMut.mutate()}
      />
    </>
  );
}