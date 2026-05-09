import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("VIXON DIGITAL LTDA");
  const [cnpj, setCnpj] = useState("57.577.162/0001-04");
  const [sector, setSector] = useState("Marketing Digital");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from("company_settings").upsert({ user_id: user.id, name, cnpj, sector, phone }, { onConflict: "user_id" });
    await supabase.from("user_profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    await refreshProfile();
    setSaving(false);
    toast.success("Tudo pronto!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-1">Bem-vindo ao Cognex</h1>
        <p className="text-sm text-muted-foreground mb-5">Conte-nos sobre sua empresa</p>
        <form onSubmit={submit} className="space-y-3">
          {[
            { l: "Nome da empresa", v: name, s: setName },
            { l: "CNPJ", v: cnpj, s: setCnpj },
            { l: "Setor", v: sector, s: setSector },
            { l: "Telefone", v: phone, s: setPhone },
          ].map((f) => (
            <div key={f.l}>
              <label className="text-xs text-muted-foreground">{f.l}</label>
              <input value={f.v} onChange={(e) => f.s(e.target.value)} required
                className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          ))}
          <button disabled={saving} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Salvando..." : "Continuar para o Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
