/**
 * Rota de teste do ORQUESTRADOR (ciclo ADAPTER ↔ VERIFIER com retry).
 *
 * Mesmo caso2 já testado isoladamente (dinossauros, ATN-02 + MOT-01 +
 * LIN-06) — sabemos que ele já reprovou no VERIFIER por
 * "enunciadoCurtoOuIgual" numa rodada anterior, então é um bom teste real
 * do loop de retry entre os dois agentes.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-orchestrator
 *
 * Acompanhe também o terminal do "npm run dev" — cada tentativa do loop é
 * logada lá com o prefixo "[ORQUESTRADOR]".
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-orchestrator/ inteira) quando terminar de validar.
 */

import { NextResponse } from 'next/server'
import { orquestrarAdaptacao } from '@/lib/agents/orchestrator'

// Mesma questão fictícia já usada em test-parser/test-classifier/test-adapter
// /test-verifier — 3º ano, Matemática, já classificada como EF03MA05.
const QUESTAO_FICTICIA = {
  enunciado: 'Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?',
  alternativas: null,
  textoApoio: null,
  bnccCodigo: 'EF03MA05',
}

// Mesmo "caso2": ATN-02 + MOT-01 + LIN-06, com o interesse FAN-01 (Dinossauros).
const BARREIRAS_FICTICIAS = ['ATN-02', 'MOT-01', 'LIN-06']
const INTERESSES_FICTICIOS = ['FAN-01']

export async function GET() {
  const inicio = Date.now()

  const resultado = await orquestrarAdaptacao(QUESTAO_FICTICIA, BARREIRAS_FICTICIAS, INTERESSES_FICTICIOS)

  const duracaoMs = Date.now() - inicio

  return NextResponse.json({
    duracaoMs,
    totalTentativas: resultado.tentativas.length,
    ...resultado,
  })
}
