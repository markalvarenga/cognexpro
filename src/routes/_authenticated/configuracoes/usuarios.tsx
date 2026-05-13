import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ShieldCheck, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, setUserRole } from "@/lib/admin-roles.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({ component: Page });

const ROLE_LABEL: Record<string, string> = {
  dono: "Dono",
  admin: "Administrador",
  gestor_trafego: "Gestor de Tráfego",
  financeiro: "Financeiro",
  operacional: "Operacional",
};
const ROLE_OPTIONS = ["dono", "admin", "gestor_trafego", "financeiro", "operacional"] as const;

type Row = { user_id: string; full_name: string | null; email: string | null; roles: string[] };

function Page() {
  const { user, isAdminOrOwner, hasRole } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const fetchUsers = useServerFn(listUsersWithRoles);
  const changeRole = useServerFn(setUserRole);
  const isOwner = hasRole("dono");

  const reload = async () => {
    if (!user || !isAdminOrOwner()) {
      setLoading(false);
      return;
    }
    try {
      const { users } = await fetchUsers();
      setRows(users as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ownersCount = rows.filter((r) => r.roles.includes("dono")).length;

  const onChangeRole = async (target: string, newRole: string) => {
    setSavingId(target);
    try {
      await changeRole({ data: { target_user_id: target, new_role: newRole as typeof ROLE_OPTIONS[number] } });
      toast.success("Papel atualizado");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <PageHeader title="Usuários e Permissões" subtitle="Quem tem acesso ao COGNEX" />

      {!isAdminOrOwner() && (
        <Card className="p-4 mb-4 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Apenas administradores e donos veem a lista completa. Você está vendo seus próprios dados.
        </Card>
      )}

      {isAdminOrOwner() && ownersCount > 1 && (
        <Card className="p-4 mb-4 text-xs text-amber-500 flex items-center gap-2 border-amber-500/40">
          <AlertTriangle className="w-4 h-4" />
          Existem {ownersCount} donos cadastrados. Recomenda-se manter apenas um dono.
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Users className="w-4 h-4" /></div>
          <div>
            <p className="text-2xl font-semibold">{rows.length}</p>
            <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
          <div>
            <p className="text-2xl font-semibold">{rows.filter((r) => r.roles.includes("admin") || r.roles.includes("dono")).length}</p>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-[220px]">Papel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">Carregando…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell className="font-medium">{r.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                <TableCell>
                  {isOwner && r.user_id !== user?.id ? (
                    <Select
                      value={r.roles[0] ?? "operacional"}
                      disabled={savingId === r.user_id}
                      onValueChange={(v) => onChangeRole(r.user_id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>{ROLE_LABEL[role]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {r.roles.map((role) => (
                        <span key={role} className="text-[11px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-3">
        {isOwner
          ? "Apenas o Dono pode alterar papéis. Você não pode alterar o seu próprio papel."
          : "Apenas o Dono pode alterar papéis."}
      </p>
    </>
  );
}
