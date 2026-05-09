import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Email de recuperação enviado!");
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        <h1 className="text-lg font-semibold mb-1">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mb-5">Digite seu email para receber o link</p>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90">
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
        <div className="text-xs text-muted-foreground mt-4 text-center">
          <Link to="/login" className="hover:text-foreground">Voltar para login</Link>
        </div>
      </div>
    </div>
  );
}
