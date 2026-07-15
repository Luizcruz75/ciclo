/**
 * Rota de teste do agente VERIFIER.
 *
 * Encadeia ADAPTER → VERIFIER usando o mesmo caso2 já testado em
 * test-adapter (dinossauros): o próprio ADAPTER emitiu o alerta "enunciado
 * ficou maior que o original" nesse caso — é exatamente o problema que o
 * VERIFIER deveria pegar de forma independente, no item "enunciadoCurtoOuIgual".
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-verifier
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-verifier/ inteira) quando terminar de validar.
 */

import { NextResponse } from 'next/server'
import { adaptarQuestao } from '@/lib/agents/adapter'
import { auditarAdaptacao } from '@/lib/agents/verifier'

// Mesma questão fictícia já usada em test-parser/test-classifier/test-adapter
// — 3º ano, Matemática, já classificada como EF03MA05.
const QUESTAO_FICTICIA = {
  enunciado: 'Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?',
  alternativas: null,
  textoApoio: null,
  bnccCodigo: 'EF03MA05',
}

// Mesmo "caso2" do test-adapter: ATN-02 + MOT-01 + LIN-06, com o interesse
// FAN-01 (Dinossauros) — o caso que recebeu o alerta de tamanho.
const BARREIRAS_FICTICIAS = ['ATN-02', 'MOT-01', 'LIN-06']
const INTERESSES_FICTICIOS = ['FAN-01']

export async function GET() {
  const inicio = Date.now()

  const resultadoAdapter = await adaptarQuestao(
    QUESTAO_FICTICIA,
    BARREIRAS_FICTICIAS,
    INTERESSES_FICTICIOS
  )

  if (!resultadoAdapter.sucesso) {
    return NextResponse.json({
      duracaoMs: Date.now() - inicio,
      etapa: 'adapter',
      ...resultadoAdapter,
    })
  }

  const resultadoVerifier = await auditarAdaptacao(
    QUESTAO_FICTICIA,
    resultadoAdapter.adaptacao,
    BARREIRAS_FICTICIAS
  )

  const duracaoMs = Date.now() - inicio

  // Debug explícito: ADAPTER e VERIFIER precisam estar auditando o MESMO
  // texto adaptado. Estes campos existem só para tornar isso visualmente
  // óbvio na resposta — sem precisar inferir de duas chamadas separadas.
  const debugComprimento = {
    enunciadoOriginal: QUESTAO_FICTICIA.enunciado,
    enunciadoOriginalLength: QUESTAO_FICTICIA.enunciado.length,
    enunciadoAdaptado: resultadoAdapter.adaptacao.enunciadoAdaptado,
    enunciadoAdaptadoLength: resultadoAdapter.adaptacao.enunciadoAdaptado.length,
  }

  return NextResponse.json({
    duracaoMs,
    debugComprimento,
    adapter: resultadoAdapter,
    verifier: resultadoVerifier,
  })
}
