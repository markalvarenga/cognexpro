import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro/contas")({ component: Page });

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("accounts").select("*").order("created_at")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from("accounts").insert({ ...p, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Conta criada"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("accounts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Removida"); },
  });

  const total = accounts.reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0);

  return (
    <>
      <PageHeader title="Contas Bancárias" subtitle="Gerencie suas contas e cartões"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova conta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
              <NewAccountForm onSubmit={(p) => create.mutate(p)} loading={create.isPending} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs uppercase text-muted-foreground">Saldo total consolidado</div>
        <div className="text-3xl font-semibold mt-2">{brl(total)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((a: any) => (
          <div key={a.id} className="bg-card border border-border rounded-xl p-5 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: a.color }} />
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.institution}</div>
                </div>
              </div>
              <Badge variant={a.status === "ativa" ? "default" : "secondary"}>{a.status}</Badge>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">{a.type}</div>
              <div className="text-xl font-semibold mt-1">{brl(a.balance)}</div>
              {a.cpf_cnpj_titular && <div className="text-xs text-muted-foreground mt-1">{a.cpf_cnpj_titular}</div>}
            </div>
            <Button size="icon" variant="ghost" className="absolute top-3 right-3 opacity-50 hover:opacity-100"
              onClick={() => remove.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {accounts.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">Nenhuma conta.</div>}
      </div>
    </>
  );
}

function NewAccountForm({ onSubmit, loading }: { onSubmit: (p: any) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Conta Corrente");
  const [institution, setInstitution] = useState("");
  const [cpf, setCpf] = useState("");
  const [balance, setBalance] = useState("0");
  const [color, setColor] = useState("#8B5CF6");

  return (
    <div className="space-y-3">
      <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Instituição</Label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>CPF/CNPJ titular</Label><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></div>
        <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
      </div>
      <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" /></div>
      <DialogFooter>
        <Button disabled={loading || !name || !institution} onClick={() => onSubmit({ name, type, institution, cpf_cnpj_titular: cpf, balance: Number(balance), color })}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
