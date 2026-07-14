-- Espelha todo novo usuário criado em auth.users para public.professores.
-- Necessário porque alunos.professor_id (e as policies de RLS) referenciam
-- public.professores.id, não auth.users diretamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.professores (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
