import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { logAction } from "@/lib/contingencia-log";
import { toast } from "sonner";

export function SecretField({
  label,
  value,
  onChange,
  entity,
  entityId,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  entity: string;
  entityId?: string | null;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    timer.current = setTimeout(() => setVisible(false), 10_000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const reveal = () => {
    if (!visible && value) {
      logAction("view_secret", entity, entityId);
    }
    setVisible((v) => !v);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value ?? "");
      setCopied(true);
      logAction("view_secret", entity, entityId);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5">
        <Input
          type={visible ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
        <Button type="button" variant="outline" size="icon" onClick={reveal} title={visible ? "Ocultar" : "Mostrar"}>
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}