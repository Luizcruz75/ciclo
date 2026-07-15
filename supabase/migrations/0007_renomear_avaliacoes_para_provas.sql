-- ============================================================================
-- 0007_renomear_avaliacoes_para_provas.sql
-- ============================================================================
-- A tabela nasceu como "avaliacoes" (0001_schema_inicial.sql, comentário:
-- "= provas do SDD, só renomeada"), mas toda a documentação do projeto
-- (SDD, PRD, roadmap) e as rotas do app (/provas/nova, /provas/[id]/editor)
-- sempre usaram "prova". Decisão: reverter para "provas", nome mais curto e
-- consistente com documentação e URLs (decisão registrada em
-- 00-governanca/decisoes-travadas no Obsidian).
--
-- RENAME TABLE preserva automaticamente: dados, RLS habilitado/forçado,
-- índices, triggers e foreign keys que apontam para a tabela. Só os NOMES
-- de índice, trigger e policy (que incluíam "avaliacoes" no nome) e a coluna
-- de FK em questoes (avaliacao_id) precisam ser renomeados manualmente.
-- ----------------------------------------------------------------------------

alter table public.avaliacoes rename to provas;

alter index idx_avaliacoes_professor_id rename to idx_provas_professor_id;
alter trigger trg_avaliacoes_atualizado_em on public.provas rename to trg_provas_atualizado_em;
alter policy "professor_ve_proprias_avaliacoes" on public.provas rename to "professor_ve_proprias_provas";

alter table public.questoes rename column avaliacao_id to prova_id;
alter index idx_questoes_avaliacao_id rename to idx_questoes_prova_id;
alter policy "professor_ve_questoes_das_proprias_avaliacoes" on public.questoes
  rename to "professor_ve_questoes_das_proprias_provas";
