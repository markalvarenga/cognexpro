import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { THEME_COLORS, applyThemeColor } from "@/lib/theme";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({ component: Page });

function Page() {
  const { user, refreshProfile, roles } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [themeColor, setThemeColor] = useState<string>("#8B5CF6");
  const [twoFa, setTwoFa] = useState(false);
  const [cursor, setCursor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_profiles")
      .select("full_name,username,phone,theme_color,two_fa_enabled,cursor_personalizado")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setFullName(data.full_name ?? "");
        setUsername(data.username ?? "");
        setPhone(data.phone ?? "");
        setThemeColor(data.theme_color ?? "#8B5CF6");
        setTwoFa(!!data.two_fa_enabled);
        setCursor(!!data.cursor_personalizado);
      });
  }, [user?.id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_profiles")
      .update({
        full_name: fullName,
        username,
        phone,
        theme_color: themeColor,
        two_fa_enabled: twoFa,
        cursor_personalizado: cursor,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    applyThemeColor(themeColor);
    refreshProfile();
  }

  async function changePassword() {
    const np = prompt("Nova senha (mínimo 6 caracteres):");
    if (!np || np.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) return toast.error(error.message);
    toast.success("Senha alterada");
  }

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        subtitle="Dados pessoais, segurança e personalização"
        actions={<Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold">Informações pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <Separator />
          <h3 className="text-sm font-semibold">Cor do tema</h3>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setThemeColor(c.hex); applyThemeColor(c.hex); }}
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition"
                style={{
                  backgroundColor: c.hex,
                  borderColor: themeColor.toLowerCase() === c.hex.toLowerCase() ? "white" : "transparent",
                }}
                title={c.name}
              >
                {themeColor.toLowerCase() === c.hex.toLowerCase() && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Segurança</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Autenticação em 2 fatores</p>
                <p className="text-[11px] text-muted-foreground">Camada extra ao entrar</p>
              </div>
              <Switch checked={twoFa} onCheckedChange={setTwoFa} />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={changePassword}>
              Alterar senha
            </Button>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold">Personalização</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Cursor personalizado</p>
                <p className="text-[11px] text-muted-foreground">Estilo visual do ponteiro</p>
              </div>
              <Switch checked={cursor} onCheckedChange={setCursor} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-2">Permissões</h3>
            <div className="flex flex-wrap gap-1.5">
              {roles.length === 0 && <span className="text-xs text-muted-foreground">Sem papéis atribuídos</span>}
              {roles.map((r) => (
                <span key={r} className="text-[11px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {r}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
