-- Cria aluno + barreiras confirmadas numa transação só. Sem isso, se a
-- inserção de barreiras_aluno falhasse no meio, sobraria um aluno "fantasma"
-- sem nenhuma barreira confirmada — violando a regra de que todo aluno
-- cadastrado tem ao menos uma barreira.
-- security invoker (padrão): roda com o papel do professor chamador, então
-- as policies de RLS de alunos/barreiras_aluno continuam valendo normalmente.
create or replace function public.criar_aluno_com_barreiras(
  p_nome_completo text,
  p_iniciais text,
  p_ano_escolar smallint,
  p_barreira_codigos text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_aluno_id uuid;
  v_codigo text;
begin
  if p_barreira_codigos is null or array_length(p_barreira_codigos, 1) is null then
    raise exception 'ao menos uma barreira é obrigatória';
  end if;

  insert into public.alunos (professor_id, nome_completo, iniciais, ano_escolar)
  values (auth.uid(), p_nome_completo, p_iniciais, p_ano_escolar)
  returning id into v_aluno_id;

  foreach v_codigo in array p_barreira_codigos loop
    insert into public.barreiras_aluno (aluno_id, barreira_codigo, confirmada_por)
    values (v_aluno_id, v_codigo, auth.uid());
  end loop;

  return v_aluno_id;
end;
$$;

revoke execute on function public.criar_aluno_com_barreiras(text, text, smallint, text[]) from public, anon;
grant execute on function public.criar_aluno_com_barreiras(text, text, smallint, text[]) to authenticated;
