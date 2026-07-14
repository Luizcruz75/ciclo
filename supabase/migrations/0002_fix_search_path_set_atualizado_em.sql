-- Corrige advisory de segurança "function_search_path_mutable" apontado
-- pelo Supabase Advisor logo após aplicar 0001. Fixa search_path da função
-- de trigger para evitar sequestro de schema.
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
