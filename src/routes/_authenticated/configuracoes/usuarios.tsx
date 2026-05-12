import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes/usuarios")({ component: Page });

const ROLE_LABEL: Record<string, string> = {
  dono: "Dono",
  admin: "Administrador",
  gestor_trafego: "Gestor de Tráfego",
  financeiro: "Financeiro",
  operacional: "Operacional",
};

type Row = { user_id: string; full_name: string | null; email: string | null; roles: string[] };

function Page() {
  const { user, isAdminOrOwner } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profiles }, { data: roleRows }] = await Promise.all([
        supabase.from("user_profiles").select("user_id,full_name,email"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const map = new Map<string, Row>();
      (profiles ?? []).forEach((p) => map.set(p.user_id, { ...p, roles: [] }));
      (roleRows ?? []).forEach((r) => {
        const cur = map.get(r.user_id);
        if (cur) cur.roles.push(r.role);
        else map.set(r.user_id, { user_id: r.user_id, full_name: null, email: null, roles: [r.role] });
      });
      setRows(Array.from(map.values()));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <>
      <PageHeader title="Usuários e Permissões" subtitle="Quem tem acesso ao COGNEX" />

      {!isAdminOrOwner() && (
        <Card className="p-4 mb-4 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Apenas administradores e donos veem a lista completa. Você está vendo seus próprios dados.
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
              <TableHead>Papéis</TableHead>
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
                  <div className="flex flex-wrap gap-1">
                    {r.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {r.roles.map((role) => (
                      <span key={role} className="text-[11px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {ROLE_LABEL[role] ?? role}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[11px] text-muted-foreground mt-3">
        Para convidar novos usuários ou ajustar papéis, contate o suporte. Edição de papéis exige migração separada por segurança.
      </p>
    </>
  );
}
