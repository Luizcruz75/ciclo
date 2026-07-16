'use server'

import { createClient } from '@/lib/supabase/server'
import { orquestrarAdaptacao, type ResultadoOrquestracao } from '@/lib/orchestrator'
import { getBarreirasPorCodigos } from '@/lib/barreiras'
import { getCodigosInteressesValidos } from '@/lib/interesses'

// Passo 9-10 do fluxo (SDD §3): professor escolhe o aluno para uma questão
// específica, o orquestrador roda o ciclo ADAPTER↔VERIFIER (até 3
// tentativas), e o resultado é gravado em `adaptacoes` — aprovado ou com
// alerta vermelho, nunca silenciosamente forçado a "sucesso".
export async function adaptarQuestaoParaAluno(input: {
  questaoId: string
  alunoId: string
}): Promise<
  | { sucesso: true; adaptacaoId: string; resultado: ResultadoOrquestracao }
  | { sucesso: false; erro: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  // Busca a questão (RLS já garante que só vem se pertencer a uma prova do
  // professor logado) e o aluno com suas barreiras/interesses confirmados.
  const { data: questao, error: erroQuestao } = await supabase
    .from('questoes')
    .select('id, enunciado, alternativas, bncc_codigo')
    .eq('id', input.questaoId)
    .single()

  if (erroQuestao || !questao) {
    return { sucesso: false, erro: 'Questão não encontrada.' }
  }

  const { data: barreirasAluno, error: erroBarreiras } = await supabase
    .from('barreiras_aluno')
    .select('barreira_codigo')
    .eq('aluno_id', input.alunoId)

  if (erroBarreiras) {
    return { sucesso: false, erro: 'Não foi possível carregar as barreiras do aluno.' }
  }

  const barreirasCodigos = (barreirasAluno ?? []).map((b) => b.barreira_codigo as string)

  if (barreirasCodigos.length === 0) {
    return {
      sucesso: false,
      erro: 'Este aluno não tem nenhuma barreira confirmada. Cadastre as barreiras antes de adaptar.',
    }
  }

  // getBarreirasPorCodigos valida contra a lista fechada (R2) antes de
  // seguir — se algum código no banco não existir mais no JSON curado,
  // ele simplesmente não entra na lista, sem quebrar a adaptação.
  const barreirasValidadas = getBarreirasPorCodigos(barreirasCodigos).map((b) => b.codigo)

  const { data: interessesAluno, error: erroInteresses } = await supabase
    .from('interesses_aluno')
    .select('interesse_codigo')
    .eq('aluno_id', input.alunoId)

  if (erroInteresses) {
    return { sucesso: false, erro: 'Não foi possível carregar os interesses do aluno.' }
  }

  // getCodigosInteressesValidos valida contra a lista fechada (mesmo padrão
  // de barreiras acima) — código no banco que não existir mais no JSON
  // curado simplesmente não entra, sem quebrar a adaptação.
  const codigosInteressesValidos = getCodigosInteressesValidos()
  const interessesCodigos = (interessesAluno ?? [])
    .map((i) => i.interesse_codigo as string)
    .filter((codigo) => codigosInteressesValidos.has(codigo))

  const resultado = await orquestrarAdaptacao(
    {
      enunciado: questao.enunciado,
      alternativas: questao.alternativas,
      textoApoio: null,
      bnccCodigo: questao.bncc_codigo,
    },
    barreirasValidadas,
    interessesCodigos
  )

  if (!resultado.sucesso) {
    return { sucesso: false, erro: resultado.erro }
  }

  // Tanto aprovado quanto reprovado-com-alerta são gravados — a diferença
  // é o conteúdo dos campos verifier_*, nunca se grava ou não (D8 em
  // decisoes-travadas: nunca entregar silenciosamente uma reprovação).
  const adaptacao = resultado.aprovado ? resultado.adaptacao : resultado.ultimaAdaptacao

  if (!adaptacao) {
    return { sucesso: false, erro: 'Nenhuma adaptação foi produzida.' }
  }

  const ultimaTentativa = resultado.tentativas[resultado.tentativas.length - 1]

  const { data: linhaAdaptacao, error: erroInsert } = await supabase
    .from('adaptacoes')
    .insert({
      questao_id: input.questaoId,
      aluno_id: input.alunoId,
      enunciado_adaptado: adaptacao.enunciadoAdaptado,
      tecnicas_aplicadas: adaptacao.tecnicasAplicadas,
      justificativa: adaptacao.justificativa,
      barreiras_atendidas: barreirasValidadas,
      verifier_aprovado: resultado.aprovado,
      verifier_tentativas: resultado.tentativas.length,
      verifier_alerta: resultado.aprovado ? null : resultado.alerta,
    })
    .select('id')
    .single()

  if (erroInsert || !linhaAdaptacao) {
    return { sucesso: false, erro: 'A adaptação foi gerada, mas não foi possível salvá-la.' }
  }

  return { sucesso: true, adaptacaoId: linhaAdaptacao.id as string, resultado }
}

// Grava o que o professor mudou na adaptação sugerida pela IA. diff_edicao
// é o campo mais valioso do sistema (PRD §5, "Dois campos mais valiosos") —
// é o sinal gratuito de onde o prompt do ADAPTER está errando.
export async function salvarEdicaoAdaptacao(input: {
  adaptacaoId: string
  enunciadoEditado: string
  diffEdicao: string
}): Promise<{ sucesso: true } | { sucesso: false; erro: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase
    .from('adaptacoes')
    .update({
      enunciado_adaptado: input.enunciadoEditado,
      editado_pelo_professor: true,
      diff_edicao: input.diffEdicao,
    })
    .eq('id', input.adaptacaoId)

  if (error) {
    return { sucesso: false, erro: 'Não foi possível salvar a edição.' }
  }

  return { sucesso: true }
}

// Feedback binário pós-adaptação (PRD §5: "o sinal mais valioso"). Grava em
// `evidencias`, tabela que já existia desde 0001_schema_inicial.sql — só
// usamos aluno_id + adaptacao_id + funcionou por enquanto; nota_obtida vs
// nota_turma_media fica para depois (fora do escopo desta tarefa).
export async function registrarEvidencia(input: {
  adaptacaoId: string
  alunoId: string
  funcionou: boolean
}): Promise<{ sucesso: true } | { sucesso: false; erro: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase.from('evidencias').insert({
    aluno_id: input.alunoId,
    adaptacao_id: input.adaptacaoId,
    funcionou: input.funcionou,
  })

  if (error) {
    return { sucesso: false, erro: 'Não foi possível registrar o feedback.' }
  }

  return { sucesso: true }
}
