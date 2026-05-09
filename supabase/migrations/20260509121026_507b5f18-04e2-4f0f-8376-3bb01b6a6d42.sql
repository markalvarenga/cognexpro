
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_owner(UUID) FROM authenticated;
