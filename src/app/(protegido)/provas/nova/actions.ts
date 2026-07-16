'use server'

import { createClient } from '@/lib/supabase/server'
import { processarProvaColada, type ResultadoPipelineProva } from '@/lib/pipeline-prova'
import type { Materia } from '@/lib/bncc'

// Passo 1 do fluxo (SDD §3): professor cola o texto, PARSER quebra em
// questões, CLASSIFIER sugere BNCC por questão. Esta action só RODA o
// pipeline em memória — não grava nada ainda. A gravação em `provas` e
// `questoes` só acontece depois que o professor CONFIRMA a BNCC de cada
// questão na tela de revisão (ver salvarProvaConfirmada), nunca antes:
// nenhuma sugestão de IA é persistida sem revisão humana (D2, D5 em
// decisoes-travadas).
export async function processarTextoProva(input: {
  textoColado: string
  materia: Materia
  anoEscolar: number
}): Promise<ResultadoPipelineProva> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, etapa: 'parser', erro: 'Sessão expirada. Faça login novamente.' }
  }

  if (!input.textoColado.trim()) {
    return { sucesso: false, etapa: 'parser', erro: 'Cole o texto da prova antes de continuar.' }
  }

  return processarProvaColada(input.textoColado, input.materia, input.anoEscolar)
}

type QuestaoConfirmada = {
  ordem: number
  enunciado: string
  alternativas: string[] | null
  bnccCodigo: string
  pontos: number
}

type ResultadoSalvar =
  | { sucesso: true; provaId: string }
  | { sucesso: false; erro: string }

// Passo 2: só roda depois que o professor confirmou (1 clique por questão,
// D... em decisoes-travadas) a BNCC de cada questão. É aqui que os dados
// nascem em `provas`/`questoes` de verdade.
export async function salvarProvaConfirmada(input: {
  titulo: string
  materia: Materia
  anoEscolar: number
  textoOriginal: string
  questoes: QuestaoConfirmada[]
}): Promise<ResultadoSalvar> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  if (input.questoes.length === 0) {
    return { sucesso: false, erro: 'Nenhuma questão para salvar.' }
  }

  const { data: prova, error: erroProva } = await supabase
    .from('provas')
    .insert({
      professor_id: user.id,
      titulo: input.titulo,
      materia: input.materia,
      ano_escolar: input.anoEscolar,
      texto_original: input.textoOriginal,
    })
    .select('id')
    .single()

  if (erroProva || !prova) {
    return { sucesso: false, erro: 'Não foi possível salvar a prova. Tente novamente.' }
  }

  const linhasQuestoes = input.questoes.map((q) => ({
    prova_id: prova.id,
    ordem: q.ordem,
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    bncc_codigo: q.bnccCodigo,
    bncc_confirmado_por: user.id,
    pontos: q.pontos,
  }))

  const { error: erroQuestoes } = await supabase.from('questoes').insert(linhasQuestoes)

  if (erroQuestoes) {
    // A prova já foi criada; questões falharam. Não deixamos uma prova
    // "fantasma" sem questões — removemos e reportamos erro, para o
    // professor tentar de novo do zero em vez de ficar com dado incompleto.
    await supabase.from('provas').delete().eq('id', prova.id)
    return { sucesso: false, erro: 'Não foi possível salvar as questões. Tente novamente.' }
  }

  return { sucesso: true, provaId: prova.id as string }
}
