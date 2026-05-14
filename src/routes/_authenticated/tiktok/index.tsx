import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  disconnectTikTok,
  getConnectionStatus,
  getTikTokAuthUrl,
} from "@/lib/tiktok-auth.functions";
import { listLocalAccounts, syncAccountsFromToken } from "@/lib/tiktok-bc.functions";
import { useTikTokStore } from "@/store/tiktok";

export const Route = createFileRoute("/_authenticated/tiktok/")({
  component: TikTokDashboard,
});

function TikTokDashboard() {
  const router = useRouter();
  const setConnection = useTikTokStore((s) => s.setConnection);

  const fetchStatus = useServerFn(getConnectionStatus);
  const fetchAuthUrl = useServerFn(getTikTokAuthUrl);
  const fetchAccounts = useServerFn(listLocalAccounts);
  const syncFn = useServerFn(syncAccountsFromToken);
  const disconnectFn = useServerFn(disconnectTikTok);

  const status = useQuery({ queryKey: ["tiktok", "status"], queryFn: () => fetchStatus({}) });
  const accounts = useQuery({
    queryKey: ["tiktok", "accounts"],
    queryFn: () => fetchAccounts({}),
    enabled: !!status.data?.connected,
  });

  // Espelha o status no store local
  useEffect(() => {
    if (!status.data) return;
    setConnection({
      connected: status.data.connected,
      advertiserIds: status.data.advertiser_ids,
      bcId: status.data.bc_id,
    });
  }, [status.data, setConnection]);

  // Detecta retorno do OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      toast.success("TikTok conectado!");
      window.history.replaceState({}, "", window.location.pathname);
      status.refetch();
    }
  }, [status]);

  const connectMut = useMutation({
    mutationFn: () => fetchAuthUrl({}),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const syncMut = useMutation({
    mutationFn: () => syncFn({}),
    onSuccess: ({ synced }) => {
      toast.success(`${synced} contas sincronizadas`);
      router.invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectFn({}),
    onSuccess: () => {
      toast.success("Desconectado");
      status.refetch();
    },
  });

  if (status.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  const connected = status.data?.connected ?? false;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                connected
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {connected ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-semibold">
                {connected ? "Conta TikTok conectada" : "Não conectado"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {connected
                  ? `${status.data?.advertiser_ids.length ?? 0} advertisers vinculados${
                      status.data?.bc_id ? ` · BC ${status.data.bc_id}` : ""
                    }`
                  : "Conecte sua conta para ver Business Centers e advertisers"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMut.mutate()}
                  disabled={syncMut.isPending}
                >
                  {syncMut.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                  )}
                  Sincronizar contas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectMut.mutate()}
                  disabled={disconnectMut.isPending}
                >
                  <Unlink className="w-4 h-4 mr-1.5" /> Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                {connectMut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-1.5" />
                )}
                Conectar TikTok
              </Button>
            )}
          </div>
        </div>
      </Card>

      {connected && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Contas de anúncio
          </h2>
          {accounts.isLoading ? (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : (accounts.data?.items.length ?? 0) === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma conta sincronizada ainda. Clique em <strong>Sincronizar contas</strong>.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.data?.items.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="font-medium truncate">{a.advertiser_name ?? a.advertiser_id}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: <span className="font-mono">{a.advertiser_id}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-muted">{a.currency}</span>
                    <span className="text-muted-foreground">{a.status}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}