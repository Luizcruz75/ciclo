/**
 * Rota de teste do agente PEI-WRITER.
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-pei-writer
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-pei-writer/ inteira) quando terminar de validar.
 */

import { NextResponse } from 'next/server'
import { escreverPei, type EvidenciaParaPei } from '@/lib/agents/pei-writer'

// Ainda não há evidências reais no banco (ciclo de uso completo não rodou em
// produção) — 3 evidências fictícias do mesmo aluno de teste usado nos
// outros agentes, com as barreiras já validadas (ATN-02 + MOT-01 + LIN-06).
const ALUNO_NOME = 'J.S.'
const PERIODO = '1º semestre de 2026'
const BARREIRAS_FICTICIAS = ['ATN-02', 'MOT-01', 'LIN-06']

const EVIDENCIAS_FICTICIAS: EvidenciaParaPei[] = [
  {
    // Funcionou parcialmente — precisou de ajuda em um ponto específico.
    id: 'ev-1',
    bnccCodigo: 'EF03MA05',
    tecnicasAplicadas: ['enunciado_max_2_frases', 'caixa_delimita_inicio_e_fim'],
    justificativaAdaptacao:
      'Enunciado reduzido a duas frases curtas para sustentar a atenção, com caixa delimitando onde escrever a resposta.',
    funcionou: false,
    alunoConcluiuSozinho: false,
    tempoGastoMin: 15,
    notaObtida: 6.0,
    notaTurmaMedia: 8.8,
    observacaoProfessor:
      'Ele travou na segunda pergunta e precisou que eu reformulasse oralmente antes de continuar.',
  },
  {
    // Funcionou bem — a adaptação de dinossauros já validada com o ADAPTER.
    id: 'ev-2',
    bnccCodigo: 'EF03MA05',
    tecnicasAplicadas: ['comando_destacado', 'resposta_por_marcacao', 'reescrita_no_interesse_cadastrado'],
    justificativaAdaptacao:
      'Reescrita no tema de dinossauros (interesse cadastrado do aluno) para aumentar engajamento, com resposta por marcação para reduzir o custo da escrita manual e comando destacado para ajudar a manter o foco.',
    funcionou: true,
    alunoConcluiuSozinho: true,
    tempoGastoMin: 6,
    notaObtida: 8.5,
    notaTurmaMedia: 8.8,
    observacaoProfessor:
      'Ele se engajou bastante com o tema de dinossauros e respondeu rápido, sem pedir ajuda.',
  },
  {
    // Funcionou bem novamente, em outra ocasião — acompanhou a turma.
    id: 'ev-3',
    bnccCodigo: 'EF03MA05',
    tecnicasAplicadas: ['comando_destacado', 'resposta_por_marcacao'],
    justificativaAdaptacao:
      'Resposta por marcação para reduzir o custo da escrita manual, comando destacado para ajudar a localizar o que fazer.',
    funcionou: true,
    alunoConcluiuSozinho: true,
    tempoGastoMin: 5,
    notaObtida: 9.0,
    notaTurmaMedia: 8.5,
    observacaoProfessor: 'Dessa vez ele foi até melhor que a média da turma.',
  },
]

export async function GET() {
  const inicio = Date.now()
  const resultado = await escreverPei(
    ALUNO_NOME,
    PERIODO,
    BARREIRAS_FICTICIAS,
    EVIDENCIAS_FICTICIAS
  )
  const duracaoMs = Date.now() - inicio

  return NextResponse.json({
    duracaoMs,
    ...resultado,
  })
}
