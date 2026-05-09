import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/_authenticated/financeiro/fluxo-de-caixa")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Fluxo de Caixa" subtitle="Entradas e saídas ao longo do tempo" />
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">Em construção. Esta seção será entregue na próxima fase.</p>
      </div>
    </>
  );
}
