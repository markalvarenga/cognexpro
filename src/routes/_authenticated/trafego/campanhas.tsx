import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/_authenticated/trafego/campanhas")({ component: Page });

function Page() {
  return (
    <>
      <PageHeader title="Campanhas de Tráfego Pago" subtitle="Gerencie e acompanhe todas as suas campanhas" />
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">Em construção. Esta seção será entregue na próxima fase.</p>
      </div>
    </>
  );
}
