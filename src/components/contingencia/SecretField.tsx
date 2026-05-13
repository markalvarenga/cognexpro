import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Copy, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { revealSecret } from "@/lib/contingencia-secrets.functions";

export function SecretField({
  label,
  field,
  value,
  onChange,
  entity,
  entityId,
  placeholder,
  hasStored,
}: {
  label: string;
  /** Logical field name registered in SECRET_REGISTRY (e.g. "senha_facebook") */
  field: string;
  value: string;
  onChange: (v: string) => void;
  entity: string;
  entityId?: string | null;
  placeholder?: string;
  /** True when there's already a ciphertext stored for this field (drives placeholder/reveal). */
  hasStored?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = useServerFn(revealSecret);

  useEffect(() => {
    if (!visible) return;
    timer.current = setTimeout(() => {
      setVisible(false);
      // reset revealed value back to empty so plaintext leaves memory
      if (revealed) {
        onChange("");
        setRevealed(false);
      }
    }, 10_000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, revealed, onChange]);

  const handleReveal = async () => {
    // Already showing → just hide
    if (visible) {
      setVisible(false);
      if (revealed) {
        onChange("");
        setRevealed(false);
      }
      return;
    }
    // No stored value or already typed locally → just toggle
    if (!hasStored || value || !entityId) {
      setVisible(true);
      return;
    }
    // Need to fetch from server
    setLoading(true);
    try {
      const { value: plain } = await reveal({ data: { entity, id: entityId, field } });
      onChange(plain);
      setRevealed(true);
      setVisible(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!value && hasStored && entityId) {
      // Reveal-and-copy in one click
      try {
        const { value: plain } = await reveal({ data: { entity, id: entityId, field } });
        await navigator.clipboard.writeText(plain ?? "");
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(value ?? "");
      } catch {
        toast.error("Não foi possível copiar");
        return;
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5">
        <Input
          type={visible ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasStored && !value ? "•••••••••• (clique no olho para revelar)" : placeholder}
          className="font-mono text-sm"
        />
        <Button type="button" variant="outline" size="icon" onClick={handleReveal} disabled={loading} title={visible ? "Ocultar" : "Mostrar"}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Copiar">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}