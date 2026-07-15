/**
 * Rota de teste do PIPELINE DA PROVA (processarProvaColada).
 *
 * Roda PARSER → CLASSIFIER (em lotes) sobre um texto de prova fictício com
 * várias questões, simulando o que a tela /provas/nova vai fazer nos
 * passos 5-8 do fluxo (SDD): professor cola o texto, sistema quebra em
 * questões e sugere BNCC por questão, pronto para o professor confirmar
 * com 1 clique cada.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-pipeline-prova
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-pipeline-prova/ inteira) quando terminar de validar —
 * junto com as outras 6 rotas test-* antes do deploy para produção/Vercel.
 */

import { NextResponse } from 'next/server'
import { processarProvaColada } from '@/lib/pipeline-prova'

// Prova fictícia de Matemática, 3º ano, com 3 questões — cobre os casos de
// questão dissertativa simples, questão com alternativas, e uma questão
// que depende de texto de apoio compartilhado (mesmo padrão dos testes do
// PARSER isolado).
const TEXTO_PROVA_FICTICIA = `
PROVA DE MATEMÁTICA — 3º ANO

Leia o texto abaixo e responda às questões 1 e 2.

João foi à feira com sua mãe. Eles compraram 6 maçãs e 4 bananas.

1) Quantas frutas João e sua mãe compraram ao todo?

2) Se João comer 2 maçãs no caminho de volta, quantas maçãs vão sobrar?
a) 2
b) 4
c) 6
d) 8

3) Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?
`.trim()

const MATERIA = 'matematica' as const
const ANO_ESCOLAR = 3

export async function GET() {
  const inicio = Date.now()

  const resultado = await processarProvaColada(TEXTO_PROVA_FICTICIA, MATERIA, ANO_ESCOLAR)

  const duracaoMs = Date.now() - inicio

  if (!resultado.sucesso) {
    return NextResponse.json({ duracaoMs, ...resultado })
  }

  // Resumo de alto nível: quantas questões foram extraídas e classificadas
  // com sucesso, sem precisar abrir o array completo para conferir.
  const resumo = resultado.questoes.map((q) => ({
    ordem: q.ordem,
    enunciado: q.questao.enunciado,
    bnccSugerido: q.classificacao.sucesso ? q.classificacao.dados.bnccCodigo : null,
    classificacaoFalhou: !q.classificacao.sucesso,
  }))

  return NextResponse.json({
    duracaoMs,
    totalQuestoes: resultado.questoes.length,
    avisoQuantidadeQuestoes: resultado.avisoQuantidadeQuestoes,
    resumo,
    resultado,
  })
}
