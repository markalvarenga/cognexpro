
-- Revoga execução pública/authenticated dessas funções; só service_role pode chamar
REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_encrypt(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_decrypt(bytea, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_encrypt(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_decrypt(bytea, text) TO service_role;
