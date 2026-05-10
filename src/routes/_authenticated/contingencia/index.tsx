import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/contingencia/")({
  beforeLoad: () => {
    throw redirect({ to: "/contingencia/perfis" });
  },
});