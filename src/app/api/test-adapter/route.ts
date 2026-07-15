/**
 * Rota de teste do agente ADAPTER.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-adapter
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-adapter/ inteira) quando terminar de validar.
 */

import { NextResponse } from 'next/server'
import { adaptarQuestao } from '@/lib/agents/adapter'

// Mesma questão fictícia já usada em test-parser/test-classifier — 3º ano,
// Matemática, já classificada como EF03MA05 (resolução de problemas de
// adição e subtração até milhar).
const QUESTAO_FICTICIA = {
  enunciado: 'Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?',
  alternativas: null,
  textoApoio: null,
  bnccCodigo: 'EF03MA05',
}

// Caso 1 — aluno fictício com 2 barreiras de data/barreiras.json, sem
// interesse cadastrado que habilite reescrita temática:
// - ATN-02: não sustenta atenção em texto longo
// - MOT-01: escrita manual custa mais que a habilidade
const BARREIRAS_CASO_1 = ['ATN-02', 'MOT-01']
const INTERESSES_CASO_1: string[] = []

// Caso 2 — aluno fictício com múltiplas barreiras, simulando um caso real:
// - ATN-02: não sustenta atenção em texto longo
// - MOT-01: escrita manual custa mais que a habilidade
// - LIN-06: engaja mais em contexto de interesse restrito → habilita a
//   técnica "reescrita_no_interesse_cadastrado"
// Combinada com o interesse FAN-01 (Dinossauros) de data/interesses.json.
// Com as 3 barreiras, o modelo tem várias técnicas candidatas ao mesmo
// tempo — o teste é ver se ele ainda escolhe a reescrita por interesse
// quando fizer sentido, e se a combinação final fica coerente.
const BARREIRAS_CASO_2 = ['ATN-02', 'MOT-01', 'LIN-06']
const INTERESSES_CASO_2 = ['FAN-01']

export async function GET() {
  const inicio = Date.now()

  const [caso1, caso2] = await Promise.all([
    adaptarQuestao(QUESTAO_FICTICIA, BARREIRAS_CASO_1, INTERESSES_CASO_1),
    adaptarQuestao(QUESTAO_FICTICIA, BARREIRAS_CASO_2, INTERESSES_CASO_2),
  ])

  const duracaoMs = Date.now() - inicio

  return NextResponse.json({
    duracaoMs,
    caso1: {
      descricao: 'ATN-02 + MOT-01, sem interesse — técnica de reescrita por interesse indisponível',
      ...caso1,
    },
    caso2: {
      descricao:
        'ATN-02 + MOT-01 + LIN-06, com interesse FAN-01 (Dinossauros) — várias técnicas candidatas disponíveis ao mesmo tempo',
      ...caso2,
    },
  })
}
