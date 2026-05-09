import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada!");
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Brain className="w-6 h-6" /></div>
          <div><div className="font-semibold">COGNEX</div><div className="text-[10px] text-muted-foreground -mt-0.5">Segundo Cérebro</div></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="text-lg font-semibold mb-1">Criar conta</h1>
          <p className="text-sm text-muted-foreground mb-5">Comece a organizar sua agência</p>
          <form onSubmit={submit} className="space-y-3">
            {[
              { l: "Nome completo", v: name, s: setName, t: "text" },
              { l: "Email", v: email, s: setEmail, t: "email" },
              { l: "Senha", v: password, s: setPassword, t: "password" },
              { l: "Confirmar senha", v: confirm, s: setConfirm, t: "password" },
            ].map((f) => (
              <div key={f.l}>
                <label className="text-xs text-muted-foreground">{f.l}</label>
                <input type={f.t} required value={f.v} onChange={(e) => f.s(e.target.value)}
                  className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            ))}
            <button disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
          <div className="text-xs text-muted-foreground mt-4 text-center">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
