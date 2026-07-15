'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Materia } from '@/lib/bncc'
import type { QuestaoClassificada } from '@/lib/pipeline-prova'
import { processarTextoProva, salvarProvaConfirmada } from './actions'

type Etapa = 'materia-ano' | 'colar-texto' | 'revisao'

const LIMITE_AVISO_QUANTIDADE_QUESTOES = 15

export function NovaProvaForm() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<Etapa>('materia-ano')

  const [materia, setMateria] = useState<Materia | ''>('')
  const [anoEscolar, setAnoEscolar] = useState<number | ''>('')
  const [titulo, setTitulo] = useState('')
  const [textoColado, setTextoColado] = useState('')

  const [questoes, setQuestoes] = useState<QuestaoClassificada[]>([])
  // Valor exibido no campo de cada questão — nasce com a sugestão da IA,
  // mas o professor pode editar livremente antes de confirmar.
  const [bnccCampo, setBnccCampo] = useState<Record<number, string>>({})
  // Só entra aqui depois que o professor CLICOU em confirmar (sugestão da
  // IA ou valor editado). Nunca é preenchido automaticamente — nenhuma
  // sugestão de IA é considerada "confirmada" sem essa ação explícita
  // (mesmo princípio de D5 em decisoes-travadas, aplicado à BNCC).
  const [bnccConfirmado, setBnccConfirmado] = useState<Record<number, string>>({})
  const [pontos, setPontos] = useState<Record<number, number>>({})

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoQuantidade, setAvisoQuantidade] = useState(false)

  async function handleProcessarTexto() {
    setErro('')

    if (materia === '' || anoEscolar === '') {
      setErro('Selecione a matéria e o ano escolar antes de continuar.')
      return
    }
    if (!textoColado.trim()) {
      setErro('Cole o texto da prova antes de continuar.')
      return
    }

    setCarregando(true)
    const resultado = await processarTextoProva({ textoColado, materia, anoEscolar })
    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    setQuestoes(resultado.questoes)
    setAvisoQuantidade(resultado.avisoQuantidadeQuestoes)

    const camposIniciais: Record<number, string> = {}
    const pontosInicial: Record<number, number> = {}
    for (const q of resultado.questoes) {
      camposIniciais[q.ordem] = q.classificacao.sucesso ? q.classificacao.dados.bnccCodigo : ''
      pontosInicial[q.ordem] = 0
    }
    setBnccCampo(camposIniciais)
    setBnccConfirmado({}) // nada confirmado ainda — exige clique do professor
    setPontos(pontosInicial)

    setEtapa('revisao')
  }

  async function handleSalvarProva() {
    setErro('')

    if (materia === '' || anoEscolar === '') return

    const questoesFaltandoBncc = questoes.filter((q) => !bnccConfirmado[q.ordem])
    if (questoesFaltandoBncc.length > 0) {
      setErro(
        `Confirme a habilidade BNCC de todas as questões antes de salvar (faltam ${questoesFaltandoBncc.length}).`
      )
      return
    }

    setCarregando(true)
    const resultado = await salvarProvaConfirmada({
      titulo: titulo.trim() || 'Prova sem título',
      materia,
      anoEscolar,
      textoOriginal: textoColado,
      questoes: questoes.map((q) => ({
        ordem: q.ordem,
        enunciado: q.questao.enunciado,
        alternativas: q.questao.alternativas,
        bnccCodigo: bnccConfirmado[q.ordem],
        pontos: pontos[q.ordem] ?? 0,
      })),
    })
    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    router.push(`/provas/${resultado.provaId}/editor`)
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-2">
        Nova prova
      </h1>
      <p className="text-sm text-texto-secundario mb-8">
        {etapa === 'materia-ano' && 'Passo 1 de 3 — matéria e ano escolar'}
        {etapa === 'colar-texto' && 'Passo 2 de 3 — cole o texto da prova'}
        {etapa === 'revisao' && 'Passo 3 de 3 — confirme a habilidade BNCC de cada questão'}
      </p>

      {etapa === 'materia-ano' && (
        <EtapaMateriaAno
          materia={materia}
          anoEscolar={anoEscolar}
          titulo={titulo}
          onMateriaChange={setMateria}
          onAnoEscolarChange={setAnoEscolar}
          onTituloChange={setTitulo}
          onAvancar={() => {
            if (materia === '' || anoEscolar === '') {
              setErro('Selecione a matéria e o ano escolar antes de continuar.')
              return
            }
            setErro('')
            setEtapa('colar-texto')
          }}
          erro={erro}
        />
      )}

      {etapa === 'colar-texto' && (
        <EtapaColarTexto
          textoColado={textoColado}
          onTextoChange={setTextoColado}
          onVoltar={() => setEtapa('materia-ano')}
          onProcessar={handleProcessarTexto}
          carregando={carregando}
          erro={erro}
        />
      )}

      {etapa === 'revisao' && (
        <EtapaRevisao
          questoes={questoes}
          bnccCampo={bnccCampo}
          bnccConfirmado={bnccConfirmado}
          pontos={pontos}
          materia={materia as Materia}
          anoEscolar={anoEscolar as number}
          avisoQuantidade={avisoQuantidade}
          onBnccCampoChange={(ordem, codigo) => {
            setBnccCampo((atual) => ({ ...atual, [ordem]: codigo }))
            // Editar o campo desfaz uma confirmação anterior: o professor
            // precisa confirmar de novo o valor novo, nunca o antigo fica
            // "confirmado" silenciosamente enquanto o campo já mudou.
            setBnccConfirmado((atual) => {
              if (!(ordem in atual)) return atual
              const { [ordem]: _removido, ...resto } = atual
              return resto
            })
          }}
          onConfirmarBncc={(ordem) =>
            setBnccConfirmado((atual) => ({ ...atual, [ordem]: bnccCampo[ordem] }))
          }
          onPontosChange={(ordem, valor) => setPontos((atual) => ({ ...atual, [ordem]: valor }))}
          onSalvar={handleSalvarProva}
          carregando={carregando}
          erro={erro}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 1 — matéria e ano escolar
// ---------------------------------------------------------------------------

function EtapaMateriaAno({
  materia,
  anoEscolar,
  titulo,
  onMateriaChange,
  onAnoEscolarChange,
  onTituloChange,
  onAvancar,
  erro,
}: {
  materia: Materia | ''
  anoEscolar: number | ''
  titulo: string
  onMateriaChange: (m: Materia) => void
  onAnoEscolarChange: (a: number) => void
  onTituloChange: (t: string) => void
  onAvancar: () => void
  erro: string
}) {
  return (
    <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-5 space-y-6">
      <Campo label="Título da prova (opcional)">
        <input
          type="text"
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
          placeholder="Ex: Prova de matemática — 3º bimestre"
          className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta placeholder:text-texto-secundario focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
        />
      </Campo>

      <Campo label="Matéria" obrigatorio>
        <div className="flex gap-3">
          <BotaoEscolha
            selecionado={materia === 'matematica'}
            onClick={() => onMateriaChange('matematica')}
          >
            Matemática
          </BotaoEscolha>
          <BotaoEscolha
            selecionado={materia === 'portugues'}
            onClick={() => onMateriaChange('portugues')}
          >
            Português
          </BotaoEscolha>
        </div>
      </Campo>

      <Campo label="Ano escolar" obrigatorio>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((ano) => (
            <BotaoEscolha
              key={ano}
              selecionado={anoEscolar === ano}
              onClick={() => onAnoEscolarChange(ano)}
              compacto
            >
              {ano}º
            </BotaoEscolha>
          ))}
        </div>
      </Campo>

      {erro && <MensagemErro texto={erro} />}

      <BotaoPrimario onClick={onAvancar}>Continuar</BotaoPrimario>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 2 — colar texto
// ---------------------------------------------------------------------------

function EtapaColarTexto({
  textoColado,
  onTextoChange,
  onVoltar,
  onProcessar,
  carregando,
  erro,
}: {
  textoColado: string
  onTextoChange: (t: string) => void
  onVoltar: () => void
  onProcessar: () => void
  carregando: boolean
  erro: string
}) {
  return (
    <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-5 space-y-6">
      <Campo label="Cole o texto da prova" obrigatorio>
        <textarea
          value={textoColado}
          onChange={(e) => onTextoChange(e.target.value)}
          rows={14}
          placeholder="Cole aqui o texto completo da prova que você já escreveu..."
          className="w-full border border-linha rounded-botao px-4 py-3 text-sm bg-superficie text-tinta placeholder:text-texto-secundario focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15 resize-y"
        />
      </Campo>

      {erro && <MensagemErro texto={erro} />}

      <div className="flex gap-3">
        <BotaoSecundario onClick={onVoltar} disabled={carregando}>
          Voltar
        </BotaoSecundario>
        <BotaoPrimario onClick={onProcessar} carregando={carregando}>
          Processar prova
        </BotaoPrimario>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 3 — revisão
// ---------------------------------------------------------------------------

function EtapaRevisao({
  questoes,
  bnccCampo,
  bnccConfirmado,
  pontos,
  materia,
  anoEscolar,
  avisoQuantidade,
  onBnccCampoChange,
  onConfirmarBncc,
  onPontosChange,
  onSalvar,
  carregando,
  erro,
}: {
  questoes: QuestaoClassificada[]
  bnccCampo: Record<number, string>
  bnccConfirmado: Record<number, string>
  pontos: Record<number, number>
  materia: Materia
  anoEscolar: number
  avisoQuantidade: boolean
  onBnccCampoChange: (ordem: number, codigo: string) => void
  onConfirmarBncc: (ordem: number) => void
  onPontosChange: (ordem: number, valor: number) => void
  onSalvar: () => void
  carregando: boolean
  erro: string
}) {
  return (
    <div className="space-y-4">
      {avisoQuantidade && (
        <div className="bg-tarja/15 border border-tarja rounded-card px-4 py-3 text-sm text-tinta">
          Identificamos {questoes.length} questões — processar as adaptações pode levar um pouco
          mais de tempo.
        </div>
      )}

      {questoes.map((q) => (
        <QuestaoRevisao
          key={q.ordem}
          questao={q}
          materia={materia}
          anoEscolar={anoEscolar}
          valorCampo={bnccCampo[q.ordem] ?? ''}
          confirmada={bnccConfirmado[q.ordem] !== undefined}
          pontosValor={pontos[q.ordem] ?? 0}
          onCampoChange={(codigo) => onBnccCampoChange(q.ordem, codigo)}
          onConfirmar={() => onConfirmarBncc(q.ordem)}
          onPontosChange={(valor) => onPontosChange(q.ordem, valor)}
        />
      ))}

      {erro && <MensagemErro texto={erro} />}

      <BotaoPrimario onClick={onSalvar} carregando={carregando}>
        Salvar prova e continuar
      </BotaoPrimario>
    </div>
  )
}

function QuestaoRevisao({
  questao,
  valorCampo,
  confirmada,
  pontosValor,
  onCampoChange,
  onConfirmar,
  onPontosChange,
}: {
  questao: QuestaoClassificada
  materia: Materia
  anoEscolar: number
  valorCampo: string
  confirmada: boolean
  pontosValor: number
  onCampoChange: (codigo: string) => void
  onConfirmar: () => void
  onPontosChange: (valor: number) => void
}) {
  const sugestaoIA = questao.classificacao.sucesso ? questao.classificacao.dados : null

  return (
    <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-tinta">
          Questão {questao.ordem}
        </h2>
        {confirmada ? (
          <span className="text-xs font-medium uppercase tracking-[0.04em] text-salvia bg-salvia/10 px-2 py-1 rounded">
            BNCC confirmada
          </span>
        ) : (
          <span className="text-xs font-medium uppercase tracking-[0.04em] text-tinta bg-tarja px-2 py-1 rounded">
            Aguardando confirmação
          </span>
        )}
      </div>

      <p className="text-sm text-tinta mb-4">{questao.questao.enunciado}</p>

      {questao.questao.alternativas && (
        <ul className="text-sm text-texto-secundario mb-4 space-y-1">
          {questao.questao.alternativas.map((alt, i) => (
            <li key={i}>{alt}</li>
          ))}
        </ul>
      )}

      {!sugestaoIA && (
        <p className="text-sm text-erro mb-3">
          Não foi possível sugerir a BNCC automaticamente. Preencha e confirme manualmente.
        </p>
      )}

      {sugestaoIA && !confirmada && (
        <div className="text-sm text-texto-secundario mb-3">
          Sugestão da IA:{' '}
          <span className="font-[family-name:var(--font-mono)] text-tinta">
            {sugestaoIA.bnccCodigo}
          </span>
          <br />
          <span className="text-xs">{sugestaoIA.justificativa}</span>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[13px] font-medium text-tinta mb-1">
            Código BNCC
          </label>
          <input
            type="text"
            value={valorCampo}
            onChange={(e) => onCampoChange(e.target.value.toUpperCase())}
            placeholder={sugestaoIA?.bnccCodigo ?? 'Ex: EF03MA05'}
            className="w-full h-11 border border-linha rounded-botao px-4 text-sm font-[family-name:var(--font-mono)] bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />
        </div>
        {!confirmada && (
          <BotaoSecundario onClick={onConfirmar} disabled={!valorCampo} compacto>
            Confirmar
          </BotaoSecundario>
        )}
        <div className="w-24">
          <label className="block text-[13px] font-medium text-tinta mb-1">Pontos</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={pontosValor}
            onChange={(e) => onPontosChange(Number(e.target.value))}
            className="w-full h-11 border border-linha rounded-botao px-3 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes de apoio (design system — DESIGN.md §4, §6)
// ---------------------------------------------------------------------------

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string
  obrigatorio?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-tinta mb-1">
        {label}
        {obrigatorio && <span className="text-erro"> *</span>}
      </label>
      {obrigatorio && (
        <span className="sr-only">obrigatório</span>
      )}
      {children}
    </div>
  )
}

function BotaoEscolha({
  selecionado,
  onClick,
  compacto,
  children,
}: {
  selecionado: boolean
  onClick: () => void
  compacto?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 ${compacto ? 'px-3' : 'px-4'} rounded-botao text-sm font-medium border transition-colors ${
        selecionado
          ? 'bg-indigo text-white border-indigo'
          : 'bg-superficie text-tinta border-linha hover:border-indigo'
      }`}
    >
      {children}
    </button>
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
      className="w-full h-11 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {carregando && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

function BotaoSecundario({
  onClick,
  disabled,
  compacto,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  compacto?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 ${compacto ? 'px-3' : 'flex-1'} border border-indigo text-indigo text-sm font-medium rounded-botao disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

function MensagemErro({ texto }: { texto: string }) {
  return (
    <p className="text-sm text-erro flex items-center gap-1.5">
      <span aria-hidden>⚠</span>
      {texto}
    </p>
  )
}
