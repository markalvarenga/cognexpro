import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteConfirm({
  open,
  onOpenChange,
  name,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ok = typed.trim() === name.trim();
  return (
    <AlertDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTyped(""); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Para confirmar, digite o nome exatamente como aparece abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Nome: <span className="font-mono text-foreground">{name}</span></Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Digite o nome para confirmar" autoFocus />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ok}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (ok) { onConfirm(); setTyped(""); } }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}