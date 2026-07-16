'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GrupoBarreiras } from '@/lib/barreiras'
import type { CategoriaInteresses } from '@/lib/interesses'
import { criarAluno } from './actions'

const TEXTO_CONSENTIMENTO =
  'Confirmo que tenho autorização do responsável legal deste aluno para registrar, nesta plataforma, as barreiras de acesso e interesses usados para adaptar provas. Nenhum diagnóstico ou laudo médico é armazenado — apenas as barreiras funcionais indicadas abaixo.'

export function CadastroAlunoForm({
  grupos,
  categoriasInteresses,
}: {
  grupos: GrupoBarreiras[]
  categoriasInteresses: CategoriaInteresses[]
}) {
  const router = useRouter()
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [anoEscolar, setAnoEscolar] = useState<number | ''>('')
  const [barreirasSelecionadas, setBarreirasSelecionadas] = useState<string[]>([])
  const [interessesSelecionados, setInteressesSelecionados] = useState<string[]>([])
  const [consentimento, setConsentimento] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function alternarBarreira(codigo: string) {
    setBarreirasSelecionadas((atual) =>
      atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo]
    )
  }

  function alternarInteresse(codigo: string) {
    setInteressesSelecionados((atual) =>
      atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo]
    )
  }

  async function handleSubmit() {
    setErro('')

    if (!nomeCompleto.trim()) {
      setErro('Informe o nome completo do aluno.')
      return
    }
    if (anoEscolar === '') {
      setErro('Selecione o ano escolar.')
      return
    }
    if (barreirasSelecionadas.length === 0) {
      setErro('Selecione ao menos uma barreira.')
      return
    }
    if (!consentimento) {
      setErro('É necessário confirmar o consentimento do responsável.')
      return
    }

    setCarregando(true)
    const resultado = await criarAluno({
      nomeCompleto,
      anoEscolar,
      barreiraCodigos: barreirasSelecionadas,
      interesseCodigos: interessesSelecionados,
      consentimentoResponsavel: consentimento,
    })
    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    router.push(`/alunos/${resultado.alunoId}`)
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-2">
        Cadastrar aluno
      </h1>
      <p className="text-sm text-texto-secundario mb-8">
        As barreiras selecionadas aqui são o que o ADAPTER usa para adaptar as provas deste
        aluno.
      </p>

      <div className="space-y-5">
        <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-5 space-y-6">
          <Campo label="Nome completo" obrigatorio>
            <input
              type="text"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            />
          </Campo>

          <Campo label="Ano escolar" obrigatorio>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((ano) => (
                <BotaoEscolha
                  key={ano}
                  selecionado={anoEscolar === ano}
                  onClick={() => setAnoEscolar(ano)}
                  compacto
                >
                  {ano}º
                </BotaoEscolha>
              ))}
            </div>
          </Campo>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-tinta mb-1">
            Barreiras — quais dificuldades esse aluno enfrenta em prova?
            <span className="text-erro"> *</span>
          </label>
          <p className="text-[13px] text-texto-secundario mb-3">obrigatório — selecione ao menos uma</p>

          <div className="space-y-3">
            {grupos.map((grupo) => (
              <fieldset
                key={grupo.codigo}
                className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4"
              >
                <legend className="text-[13px] font-medium text-tinta px-1">{grupo.titulo}</legend>
                <div className="space-y-2 mt-2">
                  {grupo.barreiras.map((barreira) => (
                    <label
                      key={barreira.codigo}
                      className="flex items-start gap-2 text-sm text-tinta cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={barreirasSelecionadas.includes(barreira.codigo)}
                        onChange={() => alternarBarreira(barreira.codigo)}
                        className="mt-1 accent-indigo"
                      />
                      <span>
                        <span className="font-medium">{barreira.nome_curto}</span>
                        <br />
                        <span className="text-texto-secundario">{barreira.pergunta_gatilho}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-tinta mb-1">
            Interesses — o que esse aluno gosta?
          </label>
          <p className="text-[13px] text-texto-secundario mb-3">
            opcional — usado para contextualizar a adaptação, quando fizer sentido
          </p>

          <div className="space-y-3">
            {categoriasInteresses.map((categoria) => (
              <fieldset
                key={categoria.codigo}
                className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4"
              >
                <legend className="text-[13px] font-medium text-tinta px-1">{categoria.nome}</legend>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categoria.interesses.map((interesse) => (
                    <label
                      key={interesse.codigo}
                      className={`text-sm px-3 py-1.5 rounded-botao border cursor-pointer transition-colors ${
                        interessesSelecionados.includes(interesse.codigo)
                          ? 'bg-indigo text-white border-indigo'
                          : 'bg-superficie text-tinta border-linha hover:border-indigo'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={interessesSelecionados.includes(interesse.codigo)}
                        onChange={() => alternarInteresse(interesse.codigo)}
                        className="sr-only"
                      />
                      {interesse.nome}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-5">
          <label className="flex items-start gap-2.5 text-sm text-tinta cursor-pointer">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
              className="mt-1 accent-indigo"
            />
            <span>
              {TEXTO_CONSENTIMENTO} <span className="text-erro">*</span>
            </span>
          </label>
        </div>

        {erro && <MensagemErro texto={erro} />}

        <BotaoPrimario onClick={handleSubmit} carregando={carregando}>
          Cadastrar aluno
        </BotaoPrimario>
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
      className="w-full h-11 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao disabled:opacity-50 flex items-center justify-center"
    >
      {carregando ? (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
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
