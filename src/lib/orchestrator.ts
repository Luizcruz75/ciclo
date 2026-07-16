import 'server-only'
import { adaptarQuestao, type QuestaoParaAdaptar, type AdaptacaoQuestao, type ResultadoAdapter, type FeedbackTentativaAnterior } from '@/lib/agents/adapter'
import { auditarAdaptacao, type Auditoria, type ResultadoVerifier } from '@/lib/agents/verifier'
import { getBarreirasPorCodigos, type Barreira } from '@/lib/barreiras'

// ORQUESTRADOR — código próprio, sem framework (ver CLAUDE.md, seção
// Arquitetura: "Não usar LangGraph, CrewAI ou similar. Peso morto num app
// Next.js."). Esta primeira versão amarra só o ciclo ADAPTER ↔ VERIFIER —
// a parte mais crítica do pipeline, porque é onde "nenhum LLM é juiz de si
// mesmo" precisa realmente se sustentar em código, não em boa vontade do
// prompt. CLASSIFIER (antes) e PEI-WRITER (bem depois, fim de semestre) não
// entram neste loop — não há motivo para retê-los aqui.
//
// Regra do CLAUDE.md: "Se reprovar 3 vezes → entrega com alerta vermelho:
// 'não conseguimos adaptar com segurança, revise manualmente'. Nunca
// entregar silenciosamente uma adaptação reprovada." É exatamente o que o
// branco final (aprovado: false) deste arquivo faz.

const MAX_TENTATIVAS_ORQUESTRADOR = 3

export type TentativaOrquestracao = {
  numero: number
  feedbackRecebido: string | null
  resultadoAdapter: ResultadoAdapter
  resultadoVerifier: ResultadoVerifier | null
  aprovado: boolean
}

export type ResultadoOrquestracao =
  | {
      sucesso: true
      aprovado: true
      adaptacao: AdaptacaoQuestao
      tentativas: TentativaOrquestracao[]
    }
  | {
      sucesso: true
      aprovado: false
      alerta: string
      motivoUltimaReprovacao: string
      ultimaAdaptacao: AdaptacaoQuestao | null
      tentativas: TentativaOrquestracao[]
    }
  | { sucesso: false; erro: string; tentativas: TentativaOrquestracao[] }

// Guardrail determinístico (mesmo padrão de enunciadoCurtoOuIgual em
// verifier.ts): a UNIÃO de técnicas candidatas no ADAPTER não garante que
// CADA barreira do aluno tenha, de fato, pelo menos uma técnica sua
// aplicada — o modelo pode cobrir as barreiras "óbvias" (layout) e esquecer
// as mais sutis. Verificado em código, antes de gastar uma chamada cara ao
// VERIFIER, que reprovaria de qualquer forma em "barreirasAtendidas".
function encontrarBarreirasSemCobertura(barreiras: Barreira[], tecnicasAplicadas: string[]): Barreira[] {
  const aplicadas = new Set(tecnicasAplicadas)
  return barreiras.filter(
    (b) => b.tecnicas_indicadas.length > 0 && !b.tecnicas_indicadas.some((t) => aplicadas.has(t))
  )
}

function montarMotivoCoberturaBarreiras(barreirasFaltantes: Barreira[]): string {
  return barreirasFaltantes
    .map(
      (b) =>
        `A barreira ${b.codigo} (${b.nome_curto}) não teve nenhuma técnica sua aplicada. Técnicas esperadas para ela: ${b.tecnicas_indicadas.join(', ')}.`
    )
    .join(' ')
}

function montarFeedbackReprovacao(auditoria: Auditoria, itensReprovados: (keyof Auditoria)[]): string {
  const detalhes = itensReprovados
    .map((item) => `- ${item}${item === 'nivelDificuldadeMantido' ? ' (ITEM MAIS CRÍTICO)' : ''}: ${auditoria[item].motivo}`)
    .join('\n')

  return `A tentativa anterior foi REPROVADA pelo auditor nos seguintes pontos:\n${detalhes}`
}

// Monta o objeto estruturado que o ADAPTER espera (FeedbackTentativaAnterior),
// a partir da adaptação reprovada + dos itens/motivos apontados pelo VERIFIER.
// Mantém a lógica de formatação do prompt de feedback dentro do adapter.ts
// (função montarBlocoFeedbackTentativaAnterior) — o orquestrador só entrega
// os dados brutos que já tem em mãos, não formata texto de prompt.
function montarFeedbackTentativaAnterior(
  adaptacaoReprovada: AdaptacaoQuestao,
  auditoria: Auditoria,
  itensReprovados: (keyof Auditoria)[]
): FeedbackTentativaAnterior {
  return {
    adaptacaoReprovada,
    itensReprovados: itensReprovados.map((item) =>
      item === 'nivelDificuldadeMantido' ? `${item} (ITEM MAIS CRÍTICO)` : item
    ),
    motivos: itensReprovados.map((item) => auditoria[item].motivo),
  }
}

export async function orquestrarAdaptacao(
  questao: QuestaoParaAdaptar,
  barreirasCodigos: string[],
  interessesCodigos: string[] = []
): Promise<ResultadoOrquestracao> {
  const tentativas: TentativaOrquestracao[] = []
  let feedbackEstruturado: FeedbackTentativaAnterior | undefined
  let feedbackTextoParaLog: string | undefined
  let ultimaAdaptacao: AdaptacaoQuestao | null = null
  let motivoUltimaReprovacao = ''

  // Códigos inválidos são rejeitados pelo próprio adaptarQuestao() na
  // primeira chamada (ver bloco de falha do ADAPTER abaixo) — por isso é
  // seguro resolver os objetos Barreira aqui, antes do loop, e reutilizar
  // em todas as tentativas.
  const barreiras = getBarreirasPorCodigos(barreirasCodigos)

  for (let numero = 1; numero <= MAX_TENTATIVAS_ORQUESTRADOR; numero++) {
    console.log(`[ORQUESTRADOR] tentativa ${numero}/${MAX_TENTATIVAS_ORQUESTRADOR} — chamando ADAPTER${feedbackEstruturado ? ' (com feedback da reprovação anterior)' : ''}`)

    const resultadoAdapter = await adaptarQuestao(questao, barreirasCodigos, interessesCodigos, feedbackEstruturado)

    if (!resultadoAdapter.sucesso) {
      console.log(`[ORQUESTRADOR] tentativa ${numero} — ADAPTER falhou: ${resultadoAdapter.erro}`)
      tentativas.push({
        numero,
        feedbackRecebido: feedbackTextoParaLog ?? null,
        resultadoAdapter,
        resultadoVerifier: null,
        aprovado: false,
      })
      // Falha do ADAPTER não é uma reprovação de conteúdo (é erro de input ou
      // técnico) — não faz sentido insistir no mesmo loop de "tentar
      // abordagem diferente". Aborta imediatamente.
      return {
        sucesso: false,
        erro: `O ADAPTER falhou na tentativa ${numero}: ${resultadoAdapter.erro}`,
        tentativas,
      }
    }

    ultimaAdaptacao = resultadoAdapter.adaptacao

    const barreirasSemCobertura = encontrarBarreirasSemCobertura(
      barreiras,
      resultadoAdapter.adaptacao.tecnicasAplicadas
    )

    if (barreirasSemCobertura.length > 0) {
      const motivoCobertura = montarMotivoCoberturaBarreiras(barreirasSemCobertura)
      console.log(`[ORQUESTRADOR] tentativa ${numero} — REPROVADO por cobertura de barreiras (determinístico, sem chamar VERIFIER): ${motivoCobertura}`)

      motivoUltimaReprovacao = motivoCobertura
      feedbackEstruturado = {
        adaptacaoReprovada: resultadoAdapter.adaptacao,
        itensReprovados: ['coberturaBarreiras'],
        motivos: [motivoCobertura],
      }
      feedbackTextoParaLog = motivoCobertura

      tentativas.push({
        numero,
        feedbackRecebido: feedbackTextoParaLog,
        resultadoAdapter,
        resultadoVerifier: null,
        aprovado: false,
      })

      continue
    }

    console.log(`[ORQUESTRADOR] tentativa ${numero} — ADAPTER produziu adaptação com cobertura de barreiras OK, chamando VERIFIER`)

    const resultadoVerifier = await auditarAdaptacao(questao, resultadoAdapter.adaptacao, barreirasCodigos)

    if (resultadoVerifier.sucesso && resultadoVerifier.aprovado) {
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER APROVOU`)
      tentativas.push({
        numero,
        feedbackRecebido: feedbackTextoParaLog ?? null,
        resultadoAdapter,
        resultadoVerifier,
        aprovado: true,
      })
      return { sucesso: true, aprovado: true, adaptacao: resultadoAdapter.adaptacao, tentativas }
    }

    if (resultadoVerifier.sucesso) {
      motivoUltimaReprovacao = montarFeedbackReprovacao(resultadoVerifier.auditoria, resultadoVerifier.itensReprovados)
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER REPROVOU: ${resultadoVerifier.itensReprovados.join(', ')}`)

      feedbackEstruturado = montarFeedbackTentativaAnterior(
        resultadoAdapter.adaptacao,
        resultadoVerifier.auditoria,
        resultadoVerifier.itensReprovados
      )
    } else {
      motivoUltimaReprovacao = `Não foi possível concluir a auditoria: ${resultadoVerifier.erro}`
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER falhou tecnicamente: ${resultadoVerifier.erro}`)
      // Falha TÉCNICA do VERIFIER (não uma reprovação de conteúdo) — não há
      // itens de checklist para estruturar. Não montamos feedbackEstruturado
      // aqui; a próxima chamada ao ADAPTER vai sem feedback específico, só
      // repetindo a tentativa (mesmo comportamento de uma primeira chamada).
      feedbackEstruturado = undefined
    }

    feedbackTextoParaLog = motivoUltimaReprovacao

    tentativas.push({
      numero,
      feedbackRecebido: feedbackTextoParaLog ?? null,
      resultadoAdapter,
      resultadoVerifier,
      aprovado: false,
    })
  }

  console.log(`[ORQUESTRADOR] esgotadas ${MAX_TENTATIVAS_ORQUESTRADOR} tentativas sem aprovação — alerta vermelho`)

  return {
    sucesso: true,
    aprovado: false,
    alerta: 'Não conseguimos adaptar esta questão com segurança. Revise manualmente.',
    motivoUltimaReprovacao,
    ultimaAdaptacao,
    tentativas,
  }
}
