'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { ResultadoOrquestracao } from '@/lib/orchestrator'
import { Breadcrumb } from '@/components/Breadcrumb'
import {
  adaptarQuestaoParaAluno,
  salvarEdicaoAdaptacao,
  registrarEvidencia,
  gerarPdfAdaptacoes,
} from './actions'

// O ciclo ADAPTER<->VERIFIER pode levar até ~3 tentativas em série (o
// servidor tem 300s de teto — ver page.tsx). 50s é bem abaixo disso: dá
// tempo de sobra para o caso comum (1 tentativa) terminar sem aviso nenhum,
// mas avisa o professor de que algo incomum está acontecendo bem antes do
// teto real do servidor, em vez de deixar o spinner girando por até 5min.
const AVISO_DEMORA_ADAPTACAO_MS = 50_000

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

  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erroPdf, setErroPdf] = useState('')

  const selectAlunoRef = useRef<HTMLSelectElement>(null)
  const [destaqueSelectAluno, setDestaqueSelectAluno] = useState(false)

  // A mesma prova costuma ser adaptada para vários alunos da turma — em vez
  // de recarregar a página, leva o professor de volta ao seletor com um
  // destaque temporário para deixar claro o que mudou.
  function handleAdaptarOutroAluno() {
    selectAlunoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    selectAlunoRef.current?.focus()
    setDestaqueSelectAluno(true)
    setTimeout(() => setDestaqueSelectAluno(false), 1500)
  }

  // Mesmo critério do PDF (gerarPdfAdaptacoes): só conta como "adaptada"
  // se aprovada pelo VERIFIER ou revisada manualmente pelo professor.
  const questoesAdaptadasAprovadas = Object.values(adaptacoes).filter(
    (a) => a.verifier_aprovado === true || a.editado_pelo_professor
  ).length

  async function handleBaixarPdf() {
    setGerandoPdf(true)
    setErroPdf('')

    try {
      const resposta = await gerarPdfAdaptacoes({ provaId: prova.id, alunoId: alunoSelecionadoId })

      if (!resposta.sucesso) {
        setErroPdf(resposta.erro)
        return
      }

      const bytes = Uint8Array.from(atob(resposta.pdfBase64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resposta.nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Sem isso, uma falha de rede/timeout na chamada deixa o botão
      // girando pra sempre — o professor nunca vê erro nem consegue tentar
      // de novo sem recarregar a página.
      setErroPdf('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

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
        <Breadcrumb atual={prova.titulo} />
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
      <Breadcrumb atual={prova.titulo} />
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
          ref={selectAlunoRef}
          value={alunoSelecionadoId}
          onChange={(e) => handleTrocarAluno(e.target.value)}
          className={`w-full h-11 border rounded-botao px-4 text-sm bg-superficie text-tinta transition-shadow duration-300 focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15 ${
            destaqueSelectAluno ? 'border-indigo ring-2 ring-indigo/20' : 'border-linha'
          }`}
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
          <div>
            <p className="text-sm text-texto-secundario mb-2">
              {questoesAdaptadasAprovadas} de {questoes.length}{' '}
              {questoes.length === 1 ? 'questão adaptada' : 'questões adaptadas'} para este aluno
            </p>
            <BotaoPrimario onClick={handleBaixarPdf} carregando={gerandoPdf}>
              Baixar PDF da prova completa
            </BotaoPrimario>
            {erroPdf && <MensagemErro texto={erroPdf} />}
          </div>

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

          <div className="pt-6 border-t border-linha flex items-center justify-between gap-4 flex-wrap">
            <BotaoSecundario onClick={handleAdaptarOutroAluno}>
              Adaptar para outro aluno
            </BotaoSecundario>

            <div className="flex items-center gap-3">
              <span className="text-sm text-texto-secundario">Tudo salvo.</span>
              <Link
                href="/painel"
                className="h-10 px-4 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao inline-flex items-center justify-center"
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
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
  const [demorandoMuito, setDemorandoMuito] = useState(false)

  // Identifica cada chamada a handleAdaptar. Se o professor clicar em
  // "Tentar novamente" enquanto uma tentativa anterior ainda está em voo
  // (ela pode ter sido abandonada pela UI, mas o fetch em si não é
  // cancelável de uma Server Action), o resultado atrasado da tentativa
  // antiga é descartado em vez de sobrescrever o estado da tentativa atual.
  const tentativaAdaptarIdRef = useRef(0)

  async function handleFeedback(funcionou: boolean) {
    if (!adaptacaoExistente) return
    setEnviandoFeedback(true)
    setErro('')

    try {
      const resultado = await registrarEvidencia({
        adaptacaoId: adaptacaoExistente.id,
        alunoId,
        funcionou,
      })

      if (!resultado.sucesso) {
        setErro(resultado.erro)
        return
      }

      onEvidenciaRegistrada(adaptacaoExistente.id, funcionou)
    } catch {
      setErro('Não foi possível registrar o feedback. Tente novamente.')
    } finally {
      setEnviandoFeedback(false)
    }
  }

  async function handleAdaptar() {
    setErro('')
    setDemorandoMuito(false)
    setCarregando(true)

    const idTentativa = ++tentativaAdaptarIdRef.current
    const avisoDemora = setTimeout(() => {
      if (tentativaAdaptarIdRef.current === idTentativa) setDemorandoMuito(true)
    }, AVISO_DEMORA_ADAPTACAO_MS)

    try {
      const resposta = await adaptarQuestaoParaAluno({ questaoId: questao.id, alunoId })

      // Uma tentativa mais nova já assumiu (o professor clicou em "Tentar
      // novamente") — o resultado desta, agora atrasada, é descartado.
      if (tentativaAdaptarIdRef.current !== idTentativa) return

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
    } catch {
      // Sem isso, um 504/erro de rede na chamada (ex: o antigo teto de 60s
      // da function) deixa o spinner girando pra sempre — o professor nunca
      // vê nenhuma mensagem nem consegue tentar de novo sem recarregar a
      // página. Isso já aconteceu em produção.
      if (tentativaAdaptarIdRef.current === idTentativa) {
        setErro('Isso demorou mais que o esperado e não foi possível confirmar o resultado. Tente novamente.')
      }
    } finally {
      clearTimeout(avisoDemora)
      if (tentativaAdaptarIdRef.current === idTentativa) {
        setCarregando(false)
        setDemorandoMuito(false)
      }
    }
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

    try {
      const resultado = await salvarEdicaoAdaptacao({
        adaptacaoId: adaptacaoExistente.id,
        enunciadoEditado: textoEditado,
        diffEdicao: diff,
      })

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
    } catch {
      setErro('Não foi possível salvar a edição. Tente novamente.')
    } finally {
      setCarregando(false)
    }
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

      {carregando && demorandoMuito && <AvisoDemora onTentarNovamente={handleAdaptar} />}

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

// Mostrado quando uma adaptação em andamento passa de AVISO_DEMORA_ADAPTACAO_MS
// sem responder — nunca deixa o professor com um spinner girando sem
// explicação nem saída. "Tentar novamente" só reinicia a chamada pelo lado
// da UI (a tentativa antiga, se ainda resolver, é ignorada) — não existe
// como cancelar de fato uma Server Action já em voo.
function AvisoDemora({ onTentarNovamente }: { onTentarNovamente: () => void }) {
  return (
    <div className="mt-2">
      <p className="text-sm text-texto-secundario mb-2">
        Isso está demorando mais que o esperado. Você pode continuar aguardando ou tentar de novo.
      </p>
      <BotaoSecundario onClick={onTentarNovamente}>Tentar novamente</BotaoSecundario>
    </div>
  )
}
