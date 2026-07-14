-- alunos ficou sem ano_escolar quando escolas/turmas foram cortadas do MVP
-- (decisão registrada no schema inicial). A tela /alunos/novo precisa desse
-- campo como obrigatório, então ele volta a viver direto em alunos.
alter table public.alunos
  add column ano_escolar smallint not null check (ano_escolar between 1 and 5);
