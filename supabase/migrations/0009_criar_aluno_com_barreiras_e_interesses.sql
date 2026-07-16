-- ============================================================================
-- 0009_criar_aluno_com_barreiras_e_interesses.sql
-- ============================================================================
-- Estende criar_aluno_com_barreiras (0006) para gravar interesses na mesma
-- transação. Interesse é opcional (default '{}') — diferente de barreira,
-- que continua obrigatória (raise exception se vazia).
-- ----------------------------------------------------------------------------

drop function if exists public.criar_aluno_com_barreiras(text, text, smallint, text[]);

create or replace function public.criar_aluno_com_barreiras(
  p_nome_completo text,
  p_iniciais text,
  p_ano_escolar smallint,
  p_barreira_codigos text[],
  p_interesse_codigos text[] default '{}'
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

  if p_interesse_codigos is not null then
    foreach v_codigo in array p_interesse_codigos loop
      insert into public.interesses_aluno (aluno_id, interesse_codigo)
      values (v_aluno_id, v_codigo);
    end loop;
  end if;

  return v_aluno_id;
end;
$$;

revoke execute on function public.criar_aluno_com_barreiras(text, text, smallint, text[], text[]) from public, anon;
grant execute on function public.criar_aluno_com_barreiras(text, text, smallint, text[], text[]) to authenticated;
