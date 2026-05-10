import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ativa: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pausado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pausada: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  banido: "bg-red-500/15 text-red-400 border-red-500/30",
  banida: "bg-red-500/15 text-red-400 border-red-500/30",
  bloqueado: "bg-red-500/15 text-red-400 border-red-500/30",
  bloqueada: "bg-red-500/15 text-red-400 border-red-500/30",
  vencido: "bg-red-500/15 text-red-400 border-red-500/30",
  inativo: "bg-muted text-muted-foreground border-border",
  inativa: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "ativo").toLowerCase();
  const tone = TONE[s] ?? "bg-primary/15 text-primary border-primary/30";
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", tone)}>
      {status ?? "—"}
    </Badge>
  );
}