import 'server-only'
import { parseProva, type QuestaoParseada, type UsoParser } from '@/lib/agents/parser'
import { classificarQuestao, type ClassificacaoBncc, type UsoClassifier } from '@/lib/agents/classifier'
import type { Materia } from '@/lib/bncc'

// PIPELINE DA TELA "/provas/nova" — código próprio, sem framework (mesma
// decisão do orchestrator.ts, ver CLAUDE.md seção Arquitetura).
//
// Cobre os passos 5-8 do fluxo do SDD: professor cola o texto → PARSER
// quebra em questões → CLASSIFIER sugere BNCC por questão → professor
// confirma com 1 clique por questão.
//
// Este arquivo é deliberadamente separado do orchestrator.ts: aquele cuida
// só do ciclo ADAPTER↔VERIFIER (a adaptação de UMA questão para UM aluno,
// depois que o professor já escolheu o aluno — passos 9-10). Este cuida da
// etapa anterior, que roda uma vez para a prova inteira e não envolve
// nenhum aluno ainda. Misturar os dois num arquivo só faria o orchestrator
// crescer sem necessidade e confundiria as duas responsabilidades.
//
// Por que CLASSIFIER não é chamado dentro do PARSER: matéria e ano escolar
// são atributos da PROVA (ver SDD §8, tabela `provas`: materia, ano_escolar),
// informados pelo professor ao criar a prova — não algo que o PARSER
// descobre a partir do texto colado. Por isso o pipeline recebe os dois como
// parâmetro explícito, em vez de tentar inferir.

// Quantas chamadas ao CLASSIFIER rodam em paralelo por vez. Uma prova comum
// tem 5-15 questões; disparar todas de uma vez é desnecessário e arrisca
// rate limit da API. Lotes pequenos equilibram velocidade e segurança.
const TAMANHO_LOTE_CLASSIFIER = 4

// Limite de questões por prova (decisão de produto, ver SDD §4.3). Uma prova
// real de EF I costuma ter 5-15 questões. Dois níveis:
// - Acima de LIMITE_AVISO: aviso não bloqueante (prova de recuperação, etc. existem).
// - Acima de LIMITE_BLOQUEIO: bloqueia antes de chamar o CLASSIFIER — nessa
//   faixa é muito mais provável colagem por engano (dois documentos juntos)
//   do que uma prova real, e evita gastar chamadas de API à toa.
const LIMITE_AVISO_QUANTIDADE_QUESTOES = 15
const LIMITE_BLOQUEIO_QUANTIDADE_QUESTOES = 25

export type QuestaoClassificada = {
  ordem: number
  questao: QuestaoParseada
  classificacao:
    | { sucesso: true; dados: ClassificacaoBncc; uso: UsoClassifier }
    | { sucesso: false; erro: string }
}

export type ResultadoPipelineProva =
  | {
      sucesso: true
      questoes: QuestaoClassificada[]
      usoParser: UsoParser
      avisoQuantidadeQuestoes: boolean
    }
  | { sucesso: false; etapa: 'parser'; erro: string }
  | { sucesso: false; etapa: 'limite-questoes'; erro: string; quantidadeEncontrada: number }

// Roda uma lista de tarefas assíncronas em lotes de tamanho fixo, em vez de
// todas de uma vez (Promise.all direto) ou uma por uma (lento). Cada
// resultado é isolado: uma questão que falha no CLASSIFIER não derruba as
// outras — o professor confirma BNCC questão por questão de qualquer forma,
// então uma sugestão faltando em uma questão não trava a tela inteira.
async function processarEmLotes<T, R>(
  itens: T[],
  tamanhoLote: number,
  processar: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = []

  for (let inicio = 0; inicio < itens.length; inicio += tamanhoLote) {
    const lote = itens.slice(inicio, inicio + tamanhoLote)
    const resultadosLote = await Promise.all(lote.map(processar))
    resultados.push(...resultadosLote)
  }

  return resultados
}

export async function processarProvaColada(
  textoColadoBruto: string,
  materia: Materia,
  anoEscolar: number
): Promise<ResultadoPipelineProva> {
  const resultadoParser = await parseProva(textoColadoBruto)

  if (!resultadoParser.sucesso) {
    return { sucesso: false, etapa: 'parser', erro: resultadoParser.erro }
  }

  const quantidadeQuestoes = resultadoParser.questoes.length

  if (quantidadeQuestoes > LIMITE_BLOQUEIO_QUANTIDADE_QUESTOES) {
    return {
      sucesso: false,
      etapa: 'limite-questoes',
      erro: `Identificamos ${quantidadeQuestoes} questões no texto colado, acima do limite de ${LIMITE_BLOQUEIO_QUANTIDADE_QUESTOES}. Revise se não foram colados dois documentos juntos por engano.`,
      quantidadeEncontrada: quantidadeQuestoes,
    }
  }

  const questoesClassificadas = await processarEmLotes(
    resultadoParser.questoes,
    TAMANHO_LOTE_CLASSIFIER,
    async (questao): Promise<QuestaoClassificada> => {
      const resultadoClassifier = await classificarQuestao(
        {
          enunciado: questao.enunciado,
          alternativas: questao.alternativas,
          textoApoio: questao.textoApoio,
        },
        materia,
        anoEscolar
      )

      return {
        ordem: questao.ordem,
        questao,
        classificacao: resultadoClassifier.sucesso
          ? { sucesso: true, dados: resultadoClassifier.classificacao, uso: resultadoClassifier.uso }
          : { sucesso: false, erro: resultadoClassifier.erro },
      }
    }
  )

  return {
    sucesso: true,
    questoes: questoesClassificadas,
    usoParser: resultadoParser.uso,
    avisoQuantidadeQuestoes: quantidadeQuestoes > LIMITE_AVISO_QUANTIDADE_QUESTOES,
  }
}
