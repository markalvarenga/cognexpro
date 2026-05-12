import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/empresa")({ component: Page });

const SECTORS = ["Marketing Digital", "E-commerce", "Infoprodutor", "Agência", "Serviços", "Indústria", "Outro"];
const TIMEZONES = ["America/Sao_Paulo", "America/Recife", "America/Manaus", "America/Bahia", "UTC"];
const CURRENCIES = ["BRL", "USD", "EUR"];

function Page() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "", cnpj: "", email: "", phone: "", address: "",
    sector: "", timezone: "America/Sao_Paulo", currency: "BRL",
    fiscal_month_start: 1, week_start: "monday",
  });
  const [id, setId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("company_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setId(data.id);
        setForm({
          name: data.name ?? "",
          cnpj: data.cnpj ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          sector: data.sector ?? "",
          timezone: data.timezone ?? "America/Sao_Paulo",
          currency: data.currency ?? "BRL",
          fiscal_month_start: data.fiscal_month_start ?? 1,
          week_start: data.week_start ?? "monday",
        });
      });
  }, [user?.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = { ...form, user_id: user.id };
    const { error } = id
      ? await supabase.from("company_settings").update(payload).eq("id", id)
      : await supabase.from("company_settings").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  }

  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <>
      <PageHeader
        title="Empresa"
        subtitle="Dados cadastrais e preferências regionais"
        actions={<Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Dados da empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Razão social</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Preferências regionais</h3>
          <div className="space-y-1.5">
            <Label>Fuso horário</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEZONES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Moeda</Label>
            <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Início do mês fiscal (dia)</Label>
            <Input type="number" min={1} max={28} value={form.fiscal_month_start}
              onChange={(e) => set("fiscal_month_start", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Início da semana</Label>
            <Select value={form.week_start} onValueChange={(v) => set("week_start", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Segunda-feira</SelectItem>
                <SelectItem value="sunday">Domingo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>
    </>
  );
}
