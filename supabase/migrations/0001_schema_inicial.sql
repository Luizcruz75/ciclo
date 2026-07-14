-- ============================================================================
-- Ciclo — Schema inicial (F1)
-- Ordem: professores, alunos, barreiras_aluno, avaliacoes, adaptacoes,
--        questoes, evidencias, validacoes, peis, fontes, logs_llm
--
-- Decisões tomadas nesta revisão (confirmadas com o usuário):
--  - Colunas de auditoria em PT-BR: criado_em / atualizado_em (regra do CLAUDE.md)
--  - Sem escolas/turmas: alunos.professor_id aponta direto para professores
--  - avaliacoes = "provas" do SDD, só renomeada
--  - bncc_codigo (questoes) e barreira_codigo (barreiras_aluno) são TEXT,
--    validados na aplicação contra data/bncc-ef1.json e data/barreiras.json
--    (R2: lista fechada vive no JSON, não em tabela — não pedido nesta lista)
--  - adaptacoes.questao_id é criado SEM FK inline (questoes ainda não existe
--    nesta posição da ordem pedida); a constraint é adicionada por ALTER TABLE
--    logo após a criação de questoes, preservando a ordem 1→11 solicitada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensão + função utilitária de atualizado_em
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

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

-- ----------------------------------------------------------------------------
-- 1. professores
-- ----------------------------------------------------------------------------
create table public.professores (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  nome          text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_professores_atualizado_em
  before update on public.professores
  for each row execute function public.set_atualizado_em();

alter table public.professores enable row level security;
alter table public.professores force row level security;

create policy "professor_ve_proprio_registro"
  on public.professores
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. alunos
-- ----------------------------------------------------------------------------
-- ⚠️ R3: nenhuma coluna de diagnóstico existe aqui de propósito.
-- O diagnóstico é usado só em tela (client-side) para sugerir barreiras
-- e nunca é enviado nem persistido nesta tabela.
create table public.alunos (
  id             uuid primary key default gen_random_uuid(),
  professor_id   uuid not null references public.professores (id) on delete cascade,
  nome_completo  text not null,
  iniciais       text not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index idx_alunos_professor_id on public.alunos (professor_id);

create trigger trg_alunos_atualizado_em
  before update on public.alunos
  for each row execute function public.set_atualizado_em();

alter table public.alunos enable row level security;
alter table public.alunos force row level security;

create policy "professor_ve_proprios_alunos"
  on public.alunos
  for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. barreiras_aluno
-- ----------------------------------------------------------------------------
-- barreira_codigo referencia a lista fechada em data/barreiras.json (app-side).
-- confirmada_por é obrigatório: a barreira nunca é confirmada só pela IA (R1/R2).
create table public.barreiras_aluno (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos (id) on delete cascade,
  barreira_codigo text not null,
  confirmada_por  uuid not null references public.professores (id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (aluno_id, barreira_codigo)
);

create index idx_barreiras_aluno_aluno_id on public.barreiras_aluno (aluno_id);

create trigger trg_barreiras_aluno_atualizado_em
  before update on public.barreiras_aluno
  for each row execute function public.set_atualizado_em();

alter table public.barreiras_aluno enable row level security;
alter table public.barreiras_aluno force row level security;

create policy "professor_ve_barreiras_dos_proprios_alunos"
  on public.barreiras_aluno
  for all
  using (
    exists (
      select 1 from public.alunos a
      where a.id = barreiras_aluno.aluno_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = barreiras_aluno.aluno_id
        and a.professor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. avaliacoes  (= "provas" no SDD, renomeada)
-- ----------------------------------------------------------------------------
create table public.avaliacoes (
  id             uuid primary key default gen_random_uuid(),
  professor_id   uuid not null references public.professores (id) on delete cascade,
  titulo         text not null,
  materia        text not null check (materia in ('portugues', 'matematica')),
  ano_escolar    smallint not null check (ano_escolar between 1 and 5),
  texto_original text not null,
  eh_template    boolean not null default false,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index idx_avaliacoes_professor_id on public.avaliacoes (professor_id);

create trigger trg_avaliacoes_atualizado_em
  before update on public.avaliacoes
  for each row execute function public.set_atualizado_em();

alter table public.avaliacoes enable row level security;
alter table public.avaliacoes force row level security;

create policy "professor_ve_proprias_avaliacoes"
  on public.avaliacoes
  for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. adaptacoes
-- ----------------------------------------------------------------------------
-- questao_id é UUID NOT NULL sem FK inline: a tabela questoes ainda não existe
-- nesta posição (ordem pedida: adaptacoes antes de questoes). A constraint de
-- integridade referencial é adicionada logo após a criação de questoes (seção 6).
create table public.adaptacoes (
  id                     uuid primary key default gen_random_uuid(),
  questao_id             uuid not null,
  aluno_id               uuid not null references public.alunos (id) on delete cascade,
  enunciado_adaptado     text not null,
  tecnicas_aplicadas     text[] not null default '{}',
  justificativa          text not null,
  barreiras_atendidas    text[] not null default '{}',
  verifier_aprovado      boolean,
  verifier_tentativas    smallint not null default 0 check (verifier_tentativas between 0 and 3),
  verifier_alerta        text,
  editado_pelo_professor boolean not null default false,
  diff_edicao            text,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index idx_adaptacoes_aluno_id on public.adaptacoes (aluno_id);
create index idx_adaptacoes_questao_id on public.adaptacoes (questao_id);

create trigger trg_adaptacoes_atualizado_em
  before update on public.adaptacoes
  for each row execute function public.set_atualizado_em();

alter table public.adaptacoes enable row level security;
alter table public.adaptacoes force row level security;

create policy "professor_ve_adaptacoes_dos_proprios_alunos"
  on public.adaptacoes
  for all
  using (
    exists (
      select 1 from public.alunos a
      where a.id = adaptacoes.aluno_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = adaptacoes.aluno_id
        and a.professor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. questoes
-- ----------------------------------------------------------------------------
-- bncc_codigo referencia a lista fechada em data/bncc-ef1.json (app-side, R2).
create table public.questoes (
  id                  uuid primary key default gen_random_uuid(),
  avaliacao_id        uuid not null references public.avaliacoes (id) on delete cascade,
  ordem               smallint not null,
  enunciado           text not null,
  alternativas        jsonb,
  bncc_codigo         text not null,
  bncc_confirmado_por uuid references public.professores (id),
  pontos              numeric(4, 2) not null default 0,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  unique (avaliacao_id, ordem)
);

create index idx_questoes_avaliacao_id on public.questoes (avaliacao_id);

create trigger trg_questoes_atualizado_em
  before update on public.questoes
  for each row execute function public.set_atualizado_em();

alter table public.questoes enable row level security;
alter table public.questoes force row level security;

create policy "professor_ve_questoes_das_proprias_avaliacoes"
  on public.questoes
  for all
  using (
    exists (
      select 1 from public.avaliacoes av
      where av.id = questoes.avaliacao_id
        and av.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.avaliacoes av
      where av.id = questoes.avaliacao_id
        and av.professor_id = auth.uid()
    )
  );

-- FK adiada de adaptacoes.questao_id → questoes.id (ver comentário na seção 5)
alter table public.adaptacoes
  add constraint adaptacoes_questao_id_fkey
  foreign key (questao_id) references public.questoes (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 7. evidencias
-- ----------------------------------------------------------------------------
create table public.evidencias (
  id                     uuid primary key default gen_random_uuid(),
  aluno_id               uuid not null references public.alunos (id) on delete cascade,
  adaptacao_id           uuid not null references public.adaptacoes (id) on delete cascade,
  funcionou              boolean not null,
  aluno_concluiu_sozinho boolean,
  tempo_gasto_min        smallint,
  nota_obtida            numeric(4, 2),
  nota_turma_media       numeric(4, 2),
  observacao_professor   text,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index idx_evidencias_aluno_id on public.evidencias (aluno_id);
create index idx_evidencias_adaptacao_id on public.evidencias (adaptacao_id);

create trigger trg_evidencias_atualizado_em
  before update on public.evidencias
  for each row execute function public.set_atualizado_em();

alter table public.evidencias enable row level security;
alter table public.evidencias force row level security;

create policy "professor_ve_evidencias_dos_proprios_alunos"
  on public.evidencias
  for all
  using (
    exists (
      select 1 from public.alunos a
      where a.id = evidencias.aluno_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = evidencias.aluno_id
        and a.professor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 8. validacoes
-- ----------------------------------------------------------------------------
-- ⚠️ A rota pública /validar/[token] NÃO acessa esta tabela com a chave anon.
-- O coordenador não faz login (SDD 2), então a leitura/escrita por token
-- acontece via Route Handler no servidor usando SUPABASE_SERVICE_ROLE_KEY
-- (R4: a chave nunca sai do servidor). Por isso a única policy aqui é a do
-- professor dono — não existe policy para o papel anon.
create table public.validacoes (
  id               uuid primary key default gen_random_uuid(),
  adaptacao_id     uuid not null references public.adaptacoes (id) on delete cascade,
  token            uuid not null default gen_random_uuid() unique,
  coordenador_nome text,
  status           text not null default 'pendente' check (status in ('pendente', 'aprovado', 'com_ressalva')),
  comentario       text,
  validado_em      timestamptz,
  expira_em        timestamptz not null default (now() + interval '7 days'),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index idx_validacoes_adaptacao_id on public.validacoes (adaptacao_id);
create unique index idx_validacoes_token on public.validacoes (token);

create trigger trg_validacoes_atualizado_em
  before update on public.validacoes
  for each row execute function public.set_atualizado_em();

alter table public.validacoes enable row level security;
alter table public.validacoes force row level security;

create policy "professor_ve_validacoes_dos_proprios_alunos"
  on public.validacoes
  for all
  using (
    exists (
      select 1 from public.adaptacoes ad
      join public.alunos a on a.id = ad.aluno_id
      where ad.id = validacoes.adaptacao_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.adaptacoes ad
      join public.alunos a on a.id = ad.aluno_id
      where ad.id = validacoes.adaptacao_id
        and a.professor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. peis
-- ----------------------------------------------------------------------------
create table public.peis (
  id                uuid primary key default gen_random_uuid(),
  aluno_id          uuid not null references public.alunos (id) on delete cascade,
  periodo           text not null,
  conteudo_gerado   text not null,
  evidencias_usadas uuid[] not null default '{}',
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create index idx_peis_aluno_id on public.peis (aluno_id);

create trigger trg_peis_atualizado_em
  before update on public.peis
  for each row execute function public.set_atualizado_em();

alter table public.peis enable row level security;
alter table public.peis force row level security;

create policy "professor_ve_peis_dos_proprios_alunos"
  on public.peis
  for all
  using (
    exists (
      select 1 from public.alunos a
      where a.id = peis.aluno_id
        and a.professor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = peis.aluno_id
        and a.professor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 10. fontes
-- ----------------------------------------------------------------------------
-- Tabela de referência compartilhada (R5) — não pertence a um professor.
-- Leitura liberada para qualquer usuário autenticado; escrita reservada à
-- service role (migrações/seed), por isso não há policy de INSERT/UPDATE/DELETE.
create table public.fontes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('lei', 'artigo', 'diretriz', 'norma_tecnica')),
  titulo        text not null,
  url           text,
  citacao_abnt  text not null,
  arquivo_local text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_fontes_atualizado_em
  before update on public.fontes
  for each row execute function public.set_atualizado_em();

alter table public.fontes enable row level security;
alter table public.fontes force row level security;

create policy "usuarios_autenticados_leem_fontes"
  on public.fontes
  for select
  using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 11. logs_llm
-- ----------------------------------------------------------------------------
-- Auditoria de chamadas ao orquestrador (PARSER/CLASSIFIER/ADAPTER/VERIFIER/
-- PEI-WRITER). referencia_id aponta para o registro afetado (questao, adaptacao
-- ou pei) conforme referencia_tipo — não é FK porque é polimórfico.
create table public.logs_llm (
  id              uuid primary key default gen_random_uuid(),
  professor_id    uuid not null references public.professores (id) on delete cascade,
  agente          text not null check (agente in ('parser', 'classifier', 'adapter', 'verifier', 'pei_writer')),
  referencia_tipo text check (referencia_tipo in ('questao', 'adaptacao', 'pei')),
  referencia_id   uuid,
  modelo          text not null,
  tokens_entrada  integer,
  tokens_saida    integer,
  latencia_ms     integer,
  sucesso         boolean not null,
  erro_mensagem   text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index idx_logs_llm_professor_id on public.logs_llm (professor_id);
create index idx_logs_llm_referencia on public.logs_llm (referencia_tipo, referencia_id);

create trigger trg_logs_llm_atualizado_em
  before update on public.logs_llm
  for each row execute function public.set_atualizado_em();

alter table public.logs_llm enable row level security;
alter table public.logs_llm force row level security;

create policy "professor_ve_proprios_logs_llm"
  on public.logs_llm
  for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());
