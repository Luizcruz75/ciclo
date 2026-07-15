import 'server-only'
import { adaptarQuestao, type QuestaoParaAdaptar, type AdaptacaoQuestao, type ResultadoAdapter } from '@/lib/agents/adapter'
import { auditarAdaptacao, type Auditoria, type ResultadoVerifier } from '@/lib/agents/verifier'

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

function montarFeedbackReprovacao(auditoria: Auditoria, itensReprovados: (keyof Auditoria)[]): string {
  const detalhes = itensReprovados
    .map((item) => `- ${item}${item === 'nivelDificuldadeMantido' ? ' (ITEM MAIS CRÍTICO)' : ''}: ${auditoria[item].motivo}`)
    .join('\n')

  return `A tentativa anterior foi REPROVADA pelo auditor nos seguintes pontos:\n${detalhes}`
}

export async function orquestrarAdaptacao(
  questao: QuestaoParaAdaptar,
  barreirasCodigos: string[],
  interessesCodigos: string[] = []
): Promise<ResultadoOrquestracao> {
  const tentativas: TentativaOrquestracao[] = []
  let feedback: string | undefined
  let ultimaAdaptacao: AdaptacaoQuestao | null = null
  let motivoUltimaReprovacao = ''

  for (let numero = 1; numero <= MAX_TENTATIVAS_ORQUESTRADOR; numero++) {
    console.log(`[ORQUESTRADOR] tentativa ${numero}/${MAX_TENTATIVAS_ORQUESTRADOR} — chamando ADAPTER${feedback ? ' (com feedback da reprovação anterior)' : ''}`)

    const resultadoAdapter = await adaptarQuestao(questao, barreirasCodigos, interessesCodigos, feedback)

    if (!resultadoAdapter.sucesso) {
      console.log(`[ORQUESTRADOR] tentativa ${numero} — ADAPTER falhou: ${resultadoAdapter.erro}`)
      tentativas.push({
        numero,
        feedbackRecebido: feedback ?? null,
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
    console.log(`[ORQUESTRADOR] tentativa ${numero} — ADAPTER produziu adaptação, chamando VERIFIER`)

    const resultadoVerifier = await auditarAdaptacao(questao, resultadoAdapter.adaptacao, barreirasCodigos)

    if (resultadoVerifier.sucesso && resultadoVerifier.aprovado) {
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER APROVOU`)
      tentativas.push({
        numero,
        feedbackRecebido: feedback ?? null,
        resultadoAdapter,
        resultadoVerifier,
        aprovado: true,
      })
      return { sucesso: true, aprovado: true, adaptacao: resultadoAdapter.adaptacao, tentativas }
    }

    if (resultadoVerifier.sucesso) {
      motivoUltimaReprovacao = montarFeedbackReprovacao(resultadoVerifier.auditoria, resultadoVerifier.itensReprovados)
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER REPROVOU: ${resultadoVerifier.itensReprovados.join(', ')}`)
    } else {
      motivoUltimaReprovacao = `Não foi possível concluir a auditoria: ${resultadoVerifier.erro}`
      console.log(`[ORQUESTRADOR] tentativa ${numero} — VERIFIER falhou tecnicamente: ${resultadoVerifier.erro}`)
    }

    tentativas.push({
      numero,
      feedbackRecebido: feedback ?? null,
      resultadoAdapter,
      resultadoVerifier,
      aprovado: false,
    })

    feedback = motivoUltimaReprovacao
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
