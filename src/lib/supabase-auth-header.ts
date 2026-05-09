import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const attachSupabaseAuthHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    return next({
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  },
);