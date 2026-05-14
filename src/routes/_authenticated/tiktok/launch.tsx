import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/tiktok/launch")({
  component: () => (
    <Card className="p-6">
      <h2 className="font-semibold mb-1">Wizard de Lançamento</h2>
      <p className="text-sm text-muted-foreground">
        Wizard Smart+ Spark / Manual CBO/ABO em construção (próxima fase).
        Server function <code>launchSmart</code> já está pronta no backend.
      </p>
    </Card>
  ),
});