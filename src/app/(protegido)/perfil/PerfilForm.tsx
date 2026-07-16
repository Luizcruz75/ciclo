'use client'

import { useState } from 'react'
import { atualizarNomeProfessor } from './actions'

export function PerfilForm({ nomeAtual }: { nomeAtual: string }) {
  const [nome, setNome] = useState(nomeAtual)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    setSalvo(false)

    const resultado = await atualizarNomeProfessor(nome)

    setCarregando(false)

    if (!resultado.sucesso) {
      setErro(resultado.erro)
      return
    }

    setSalvo(true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-6"
    >
      <label className="block text-[13px] font-medium text-tinta mb-1.5" htmlFor="nome">
        Nome completo
      </label>
      <input
        id="nome"
        type="text"
        value={nome}
        onChange={(e) => {
          setNome(e.target.value)
          setSalvo(false)
        }}
        className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15 mb-4"
      />

      {erro && (
        <p className="text-sm text-erro flex items-center gap-1.5 mb-4">
          <span aria-hidden>⚠</span>
          {erro}
        </p>
      )}

      {salvo && !erro && <p className="text-sm text-salvia mb-4">Nome salvo.</p>}

      <button
        type="submit"
        disabled={carregando}
        className="h-10 min-w-[96px] px-4 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao disabled:opacity-50 flex items-center justify-center"
      >
        {carregando ? (
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          'Salvar'
        )}
      </button>
    </form>
  )
}
