-- Corrige advisories "anon/authenticated_security_definer_function_executable":
-- handle_new_user só deve rodar via trigger interno (on_auth_user_created),
-- nunca ser chamável diretamente via PostgREST (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
