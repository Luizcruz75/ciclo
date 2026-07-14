'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GrupoBarreiras } from '@/lib/barreiras'
import { criarAluno } from './actions'

export function CadastroAlunoForm({ grupos }: { grupos: GrupoBarreiras[] }) {
  const router = useRouter()
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [anoEscolar, setAnoEscolar] = useState<number | ''>('')
  const [barreirasSelecionadas, setBarreirasSelecionadas] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function alternarBarreira(codigo: string) {
    setBarreirasSelecionadas((atual) =>
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

    setCarregando(true)
    const resultado = await criarAluno({
      nomeCompleto,
      anoEscolar,
      barreiraCodigos: barreirasSelecionadas,
    })
    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cadastrar aluno</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            type="text"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ano escolar
          </label>
          <select
            value={anoEscolar}
            onChange={(e) => setAnoEscolar(e.target.value ? Number(e.target.value) : '')}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {[1, 2, 3, 4, 5].map((ano) => (
              <option key={ano} value={ano}>
                {ano}º ano
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Barreiras — quais dificuldades esse aluno enfrenta em prova?
          </label>

          <div className="space-y-5">
            {grupos.map((grupo) => (
              <fieldset key={grupo.codigo} className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-800 px-1">
                  {grupo.titulo}
                </legend>
                <div className="space-y-2 mt-2">
                  {grupo.barreiras.map((barreira) => (
                    <label
                      key={barreira.codigo}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={barreirasSelecionadas.includes(barreira.codigo)}
                        onChange={() => alternarBarreira(barreira.codigo)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{barreira.nome_curto}</span>
                        <br />
                        <span className="text-gray-500">{barreira.pergunta_gatilho}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button
          onClick={handleSubmit}
          disabled={carregando}
          className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {carregando ? 'Salvando...' : 'Cadastrar aluno'}
        </button>
      </div>
    </div>
  )
}
