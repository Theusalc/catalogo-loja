-- Aplicada no projeto catalogo-loja (Supabase) em 2026-11-17.
--
-- public.rls_auto_enable() é usada só pelo gatilho interno "ensure_rls",
-- que liga a proteção (RLS) em tabelas novas. O site não chama essa função.
-- Por padrão ela podia ser executada por visitantes pela API (/rest/v1/rpc),
-- o que o verificador de segurança do Supabase apontou como risco.
-- Continuam com permissão: postgres (dono) e service_role.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
