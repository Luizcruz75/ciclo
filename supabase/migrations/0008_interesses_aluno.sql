-- ============================================================================
-- 0008_interesses_aluno.sql
-- ============================================================================
-- Fecha a lacuna documentada em src/app/provas/[id]/editor/actions.ts: a
-- tabela de interesses do aluno (data/interesses.json v0.1) nunca tinha sido
-- implementada como migration, então o ADAPTER sempre rodava com
-- interessesCodigos vazio. interesse_codigo referencia a lista fechada em
-- data/interesses.json (app-side), mesmo padrão de barreira_codigo em
-- barreiras_aluno.
--
-- Sem confirmada_por: interesse é preferência da criança (o que ela gosta),
-- não um julgamento clínico/pedagógico como barreira — R1/R2 não se aplicam
-- aqui, então não exige o mesmo rastro de "quem confirmou".
-- ----------------------------------------------------------------------------

create table public.interesses_aluno (
  id               uuid primary key default gen_random_uuid(),
  aluno_id         uuid not null references public.alunos (id) on delete cascade,
  interesse_codigo text not null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (aluno_id, interesse_codigo)
);

create index idx_interesses_aluno_aluno_id on public.interesses_aluno (aluno_id);

create trigger trg_interesses_aluno_atualizado_em
  before update on public.interesses_aluno
  for each row execute function public.set_atualizado_em();

alter table public.interesses_aluno enable row level security;
alter table public.interesses_aluno force row level security;

create policy "professor_ve_interesses_dos_proprios_alunos"
  on public.interesses_aluno
  for all
  using (
    exists (
      select 1 from public.alunos a
      where a.id = interesses_aluno.aluno_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = interesses_aluno.aluno_id
        and a.professor_id = auth.uid()
    )
  );
