'use client'

import { useState } from 'react'
import type { ResultadoOrquestracao } from '@/lib/orchestrator'
import { adaptarQuestaoParaAluno, salvarEdicaoAdaptacao, registrarEvidencia } from './actions'

type Prova = { id: string; titulo: string; materia: string; ano_escolar: number }
type Questao = {
  id: string
  ordem: number
  enunciado: string
  alternativas: string[] | null
  bncc_codigo: string
  pontos: number
}
type Aluno = { id: string; nome_completo: string; iniciais: string }
type AdaptacaoExistente = {
  id: string
  questao_id: string
  aluno_id: string
  enunciado_adaptado: string
  tecnicas_aplicadas: string[]
  justificativa: string
  verifier_aprovado: boolean | null
  verifier_tentativas: number
  verifier_alerta: string | null
  editado_pelo_professor: boolean
}
type EvidenciaExistente = { adaptacao_id: string; funcionou: boolean }

export function EditorProvaForm({
  prova,
  questoes,
  alunos,
  adaptacoesExistentes,
  evidenciasExistentes,
}: {
  prova: Prova
  questoes: Questao[]
  alunos: Aluno[]
  adaptacoesExistentes: AdaptacaoExistente[]
  evidenciasExistentes: EvidenciaExistente[]
}) {
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string>('')

  // Mapa questaoId -> adaptação, recarregado sempre que uma nova adaptação
  // é gerada nesta sessão (via handleAdaptar), sem precisar recarregar a
  // página inteira.
  const [adaptacoes, setAdaptacoes] = useState<Record<string, AdaptacaoExistente>>(() => {
    const mapa: Record<string, AdaptacaoExistente> = {}
    for (const a of adaptacoesExistentes) {
      if (a.aluno_id === alunoSelecionadoId) mapa[a.questao_id] = a
    }
    return mapa
  })

  // Mapa adaptacaoId -> funcionou, atualizado localmente assim que o
  // professor dá o feedback (sem recarregar a página).
  const [evidencias, setEvidencias] = useState<Record<string, boolean>>(() => {
    const mapa: Record<string, boolean> = {}
    for (const e of evidenciasExistentes) mapa[e.adaptacao_id] = e.funcionou
    return mapa
  })

  function handleTrocarAluno(novoAlunoId: string) {
    setAlunoSelecionadoId(novoAlunoId)
    const mapa: Record<string, AdaptacaoExistente> = {}
    for (const a of adaptacoesExistentes) {
      if (a.aluno_id === novoAlunoId) mapa[a.questao_id] = a
    }
    setAdaptacoes(mapa)
  }

  if (alunos.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-2">
          {prova.titulo}
        </h1>
        <div className="bg-tarja/15 border border-tarja rounded-card px-4 py-3 text-sm text-tinta mt-6">
          Você ainda não tem nenhum aluno cadastrado. Cadastre um aluno com as barreiras dele antes
          de adaptar esta prova.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-1">
        {prova.titulo}
      </h1>
      <p className="text-sm text-texto-secundario mb-6">
        {prova.materia === 'matematica' ? 'Matemática' : 'Português'} — {prova.ano_escolar}º ano
      </p>

      <div className="mb-8">
        <label className="block text-[13px] font-medium text-tinta mb-1">
          Adaptar para
        </label>
        <select
          value={alunoSelecionadoId}
          onChange={(e) => handleTrocarAluno(e.target.value)}
          className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
        >
          <option value="">Selecione um aluno...</option>
          {alunos.map((aluno) => (
            <option key={aluno.id} value={aluno.id}>
              {aluno.nome_completo} ({aluno.iniciais})
            </option>
          ))}
        </select>
      </div>

      {alunoSelecionadoId === '' ? (
        <p className="text-sm text-texto-secundario">
          Selecione um aluno acima para começar a adaptar as questões.
        </p>
      ) : (
        <div className="space-y-4">
          {questoes.map((questao) => (
            <QuestaoAdaptacao
              key={questao.id}
              questao={questao}
              alunoId={alunoSelecionadoId}
              adaptacaoExistente={adaptacoes[questao.id]}
              evidenciaExistente={
                adaptacoes[questao.id] ? evidencias[adaptacoes[questao.id].id] : undefined
              }
              onAdaptacaoGerada={(adaptacao) =>
                setAdaptacoes((atual) => ({ ...atual, [questao.id]: adaptacao }))
              }
              onAdaptacaoEditada={(adaptacaoAtualizada) =>
                setAdaptacoes((atual) => ({ ...atual, [questao.id]: adaptacaoAtualizada }))
              }
              onEvidenciaRegistrada={(adaptacaoId, funcionou) =>
                setEvidencias((atual) => ({ ...atual, [adaptacaoId]: funcionou }))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestaoAdaptacao({
  questao,
  alunoId,
  adaptacaoExistente,
  evidenciaExistente,
  onAdaptacaoGerada,
  onAdaptacaoEditada,
  onEvidenciaRegistrada,
}: {
  questao: Questao
  alunoId: string
  adaptacaoExistente: AdaptacaoExistente | undefined
  evidenciaExistente: boolean | undefined
  onAdaptacaoGerada: (a: AdaptacaoExistente) => void
  onAdaptacaoEditada: (a: AdaptacaoExistente) => void
  onEvidenciaRegistrada: (adaptacaoId: string, funcionou: boolean) => void
}) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(false)
  const [textoEditado, setTextoEditado] = useState('')
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoOrquestracao | null>(null)
  const [enviandoFeedback, setEnviandoFeedback] = useState(false)

  async function handleFeedback(funcionou: boolean) {
    if (!adaptacaoExistente) return
    setEnviandoFeedback(true)
    setErro('')

    const resultado = await registrarEvidencia({
      adaptacaoId: adaptacaoExistente.id,
      alunoId,
      funcionou,
    })

    setEnviandoFeedback(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    onEvidenciaRegistrada(adaptacaoExistente.id, funcionou)
  }

  async function handleAdaptar() {
    setErro('')
    setCarregando(true)

    const resposta = await adaptarQuestaoParaAluno({ questaoId: questao.id, alunoId })

    setCarregando(false)

    if (!resposta.sucesso) {
      setErro(resposta.erro)
      return
    }

    setUltimoResultado(resposta.resultado)

    // A Server Action já retorna sucesso:false quando o orquestrador falha
    // tecnicamente; chegando aqui, resposta.resultado.sucesso é sempre
    // true, mas o TypeScript exige o narrowing explícito do union type.
    if (!resposta.resultado.sucesso) {
      setErro('A adaptação não pôde ser gerada.')
      return
    }

    const adaptacaoFinal = resposta.resultado.aprovado
      ? resposta.resultado.adaptacao
      : resposta.resultado.ultimaAdaptacao

    if (!adaptacaoFinal) {
      setErro('A adaptação não pôde ser gerada.')
      return
    }

    onAdaptacaoGerada({
      id: resposta.adaptacaoId,
      questao_id: questao.id,
      aluno_id: alunoId,
      enunciado_adaptado: adaptacaoFinal.enunciadoAdaptado,
      tecnicas_aplicadas: adaptacaoFinal.tecnicasAplicadas,
      justificativa: adaptacaoFinal.justificativa,
      verifier_aprovado: resposta.resultado.aprovado,
      verifier_tentativas: resposta.resultado.tentativas.length,
      verifier_alerta: resposta.resultado.aprovado ? null : resposta.resultado.alerta,
      editado_pelo_professor: false,
    })
  }

  function handleIniciarEdicao() {
    if (!adaptacaoExistente) return
    setTextoEditado(adaptacaoExistente.enunciado_adaptado)
    setEditando(true)
  }

  async function handleSalvarEdicao() {
    if (!adaptacaoExistente) return
    setCarregando(true)
    setErro('')

    // diff_edicao: o campo mais valioso do sistema (PRD §5). Registramos o
    // antes e depois em texto simples — suficiente para análise agregada
    // futura (N1: quais correções se repetem entre professores) sem
    // precisar de um formato de diff binário complexo agora.
    const diff = `ANTES:\n${adaptacaoExistente.enunciado_adaptado}\n\nDEPOIS:\n${textoEditado}`

    const resultado = await salvarEdicaoAdaptacao({
      adaptacaoId: adaptacaoExistente.id,
      enunciadoEditado: textoEditado,
      diffEdicao: diff,
    })

    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    onAdaptacaoEditada({
      ...adaptacaoExistente,
      enunciado_adaptado: textoEditado,
      editado_pelo_professor: true,
    })
    setEditando(false)
  }

  const alertaVermelho =
    adaptacaoExistente && adaptacaoExistente.verifier_aprovado === false
      ? adaptacaoExistente.verifier_alerta
      : null

  return (
    <div
      className={`bg-superficie border rounded-card shadow-[var(--shadow-card)] p-5 ${
        alertaVermelho ? 'border-linha border-l-[3px] border-l-terracota' : 'border-linha'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-tinta">
          Questão {questao.ordem}
        </h2>
        <span className="text-xs font-[family-name:var(--font-mono)] text-texto-secundario">
          {questao.bncc_codigo}
        </span>
      </div>

      <p className="text-sm text-texto-secundario mb-1">Original:</p>
      <p className="text-sm text-tinta mb-4">{questao.enunciado}</p>

      {!adaptacaoExistente && (
        <BotaoPrimario onClick={handleAdaptar} carregando={carregando}>
          Adaptar para este aluno
        </BotaoPrimario>
      )}

      {erro && <MensagemErro texto={erro} />}

      {adaptacaoExistente && (
        <div className="mt-2 border-t border-linha pt-4">
          {alertaVermelho && (
            <div className="bg-terracota/10 border border-terracota rounded-botao px-3 py-2 text-sm text-tinta mb-3">
              ⚠ {alertaVermelho}
            </div>
          )}

          <p className="text-sm text-texto-secundario mb-1">
            Adaptado
            {adaptacaoExistente.editado_pelo_professor && (
              <span className="text-xs text-indigo"> (editado por você)</span>
            )}
            :
          </p>

          {editando ? (
            <textarea
              value={textoEditado}
              onChange={(e) => setTextoEditado(e.target.value)}
              rows={4}
              className="w-full border border-indigo rounded-botao px-4 py-3 text-sm bg-superficie text-tinta focus:outline-none focus:ring-2 focus:ring-indigo/15 resize-y mb-3"
            />
          ) : (
            <p className="text-sm text-tinta mb-3">{adaptacaoExistente.enunciado_adaptado}</p>
          )}

          {!editando && adaptacaoExistente.tecnicas_aplicadas.length > 0 && (
            <p className="text-xs text-texto-secundario mb-3">
              Técnicas: {adaptacaoExistente.tecnicas_aplicadas.join(', ')}
            </p>
          )}

          {!editando && ultimoResultado && ultimoResultado.sucesso && (
            <p className="text-xs text-texto-secundario mb-3">
              {ultimoResultado.tentativas.length}{' '}
              {ultimoResultado.tentativas.length === 1 ? 'tentativa' : 'tentativas'} até{' '}
              {ultimoResultado.aprovado ? 'aprovação' : 'esgotar o limite'}.
            </p>
          )}

          <div className="flex gap-3">
            {editando ? (
              <>
                <BotaoSecundario onClick={() => setEditando(false)} disabled={carregando}>
                  Cancelar
                </BotaoSecundario>
                <BotaoPrimario onClick={handleSalvarEdicao} carregando={carregando}>
                  Salvar edição
                </BotaoPrimario>
              </>
            ) : (
              <>
                <BotaoSecundario onClick={handleIniciarEdicao}>Editar</BotaoSecundario>
                <BotaoSecundario onClick={handleAdaptar} disabled={carregando}>
                  Gerar novamente
                </BotaoSecundario>
              </>
            )}
          </div>

          {!editando && (
            <div className="mt-4 pt-4 border-t border-linha">
              {evidenciaExistente === undefined ? (
                <>
                  <p className="text-[13px] font-medium text-tinta mb-2">
                    Funcionou com o aluno?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFeedback(true)}
                      disabled={enviandoFeedback}
                      className="h-10 px-4 rounded-botao text-sm font-medium border border-linha text-tinta hover:border-salvia hover:text-salvia disabled:opacity-50"
                    >
                      👍 Funcionou
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(false)}
                      disabled={enviandoFeedback}
                      className="h-10 px-4 rounded-botao text-sm font-medium border border-linha text-tinta hover:border-terracota hover:text-terracota disabled:opacity-50"
                    >
                      👎 Não funcionou
                    </button>
                  </div>
                </>
              ) : (
                <p
                  className={`text-sm font-medium ${evidenciaExistente ? 'text-salvia' : 'text-terracota'}`}
                >
                  {evidenciaExistente ? '👍 Você marcou: funcionou' : '👎 Você marcou: não funcionou'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BotaoPrimario({
  onClick,
  carregando,
  children,
}: {
  onClick: () => void
  carregando?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className="h-10 px-4 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao disabled:opacity-50 flex items-center justify-center"
    >
      {carregando ? (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}

function BotaoSecundario({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 px-4 border border-indigo text-indigo text-sm font-medium rounded-botao disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function MensagemErro({ texto }: { texto: string }) {
  return (
    <p className="text-sm text-erro flex items-center gap-1.5 mt-2">
      <span aria-hidden>⚠</span>
      {texto}
    </p>
  )
}
