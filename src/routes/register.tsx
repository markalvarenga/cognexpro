import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error(result.error.message ?? "Falha ao entrar com Google");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
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
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">ou</span></div>
          </div>
          <button type="button" onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-md py-2 text-sm font-medium hover:bg-accent transition">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar com Google
          </button>
          <div className="text-xs text-muted-foreground mt-4 text-center">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
