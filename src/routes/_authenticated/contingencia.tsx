import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ContingenciaTabs } from "@/components/contingencia/ContingenciaTabs";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contingencia")({ component: Layout });

function Layout() {
  const { isAdminOrOwner, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !isAdminOrOwner()) navigate({ to: "/dashboard" });
  }, [loading, isAdminOrOwner, navigate]);

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Contingência</h1>
          <p className="text-xs text-muted-foreground">Gestão centralizada de perfis, BMs, contas, páginas, pixels, proxies e TikTok</p>
        </div>
      </div>
      <ContingenciaTabs />
      <Outlet />
    </>
  );
}
