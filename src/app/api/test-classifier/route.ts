/**
 * Rota de teste do agente CLASSIFIER.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-classifier
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-classifier/ inteira) quando terminar de validar.
 */

import { NextResponse } from 'next/server'
import { classificarQuestao } from '@/lib/agents/classifier'

// Exemplo fictício de questão já parseada — 3º ano, Matemática.
const QUESTAO_FICTICIA = {
  enunciado: 'Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?',
  alternativas: null,
  textoApoio: null,
}

export async function GET() {
  const inicio = Date.now()
  const resultado = await classificarQuestao(QUESTAO_FICTICIA, 'matematica', 3)
  const duracaoMs = Date.now() - inicio

  return NextResponse.json({
    duracaoMs,
    ...resultado,
  })
}
