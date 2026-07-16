-- ============================================================================
-- 0010_alunos_consentimento_responsavel.sql
-- ============================================================================
-- Registra QUE o consentimento do responsável foi confirmado no momento do
-- cadastro (checkbox obrigatório em /alunos/novo, bloqueado no Zod antes de
-- chamar a Server Action). Não é dado de saúde/diagnóstico (R3 não se
-- aplica) — é só o carimbo de quando a atestação foi feita.
-- ----------------------------------------------------------------------------

alter table public.alunos
  add column consentimento_responsavel_em timestamptz not null default now();
