/**
 * Rota de teste do ORQUESTRADOR (orquestrarAdaptacao).
 *
 * Roda o loop completo ADAPTER ↔ VERIFIER (até 3 tentativas) usando o mesmo
 * "caso difícil" já testado em test-adapter e test-verifier: 3º ano,
 * Matemática (EF03MA05), barreiras ATN-02 + MOT-01 + LIN-06, com o interesse
 * FAN-01 (Dinossauros) — o caso que historicamente reprova no item de
 * tamanho do enunciado (enunciadoCurtoOuIgual).
 *
 * O objetivo deste teste não é "conseguir aprovação" — é confirmar que o
 * orquestrador se comporta como o CLAUDE.md manda: se reprovar 3 vezes,
 * entrega aprovado:false com alerta vermelho, em vez de forçar sucesso.
 * Ver resumo da sessão 14/07/2026 (sessão 2): nesse caso específico, o
 * resultado esperado é 3 tentativas, 3 reprovações, alerta vermelho final.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-orchestrator
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-orchestrator/ inteira) quando terminar de validar —
 * junto com as outras 5 rotas test-* antes do deploy para produção/Vercel.
 */

import { NextResponse } from 'next/server'
import { orquestrarAdaptacao } from '@/lib/orchestrator'

// Mesma questão fictícia já usada em test-parser/test-classifier/test-adapter/test-verifier
// — 3º ano, Matemática, já classificada como EF03MA05.
const QUESTAO_FICTICIA = {
  enunciado: 'Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?',
  alternativas: null,
  textoApoio: null,
  bnccCodigo: 'EF03MA05',
}

// Mesmo "caso2" do test-adapter/test-verifier: ATN-02 + MOT-01 + LIN-06,
// com o interesse FAN-01 (Dinossauros) — o caso que recebeu o alerta de
// tamanho na tentativa isolada.
const BARREIRAS_FICTICIAS = ['ATN-02', 'MOT-01', 'LIN-06']
const INTERESSES_FICTICIOS = ['FAN-01']

export async function GET() {
  const inicio = Date.now()

  const resultado = await orquestrarAdaptacao(
    QUESTAO_FICTICIA,
    BARREIRAS_FICTICIAS,
    INTERESSES_FICTICIOS
  )

  const duracaoMs = Date.now() - inicio

  // Resumo de alto nível: quantas tentativas rodaram, quantas foram
  // reprovadas e por qual item, sem precisar abrir o array completo de
  // tentativas para entender o que aconteceu.
  const resumoTentativas = resultado.tentativas.map((t) => ({
    numero: t.numero,
    teveFeedback: t.feedbackRecebido !== null,
    adapterSucesso: t.resultadoAdapter.sucesso,
    verifierAprovou: t.resultadoVerifier?.sucesso ? t.resultadoVerifier.aprovado : null,
    itensReprovados:
      t.resultadoVerifier?.sucesso && !t.resultadoVerifier.aprovado
        ? t.resultadoVerifier.itensReprovados
        : [],
  }))

  return NextResponse.json({
    duracaoMs,
    totalTentativas: resultado.tentativas.length,
    resumoTentativas,
    resultado,
  })
}
