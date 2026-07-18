'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro('E-mail ou senha incorretos.')
      } else {
        router.push('/')
        router.refresh() // força o Server Component a reler a sessão
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) {
        setErro('Erro ao criar conta. Tente novamente.')
      } else {
        setErro('')
        // opcional: redirecionar ou mostrar "verifique seu e-mail"
        router.push('/')
      }
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-papel">
      <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-8 w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-6">
          {modo === 'login' ? 'Entrar no Ciclo' : 'Criar conta'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            // readOnly até o primeiro foco: impede o navegador de autopreencher
            // com a credencial do professor anterior assim que a tela carrega
            // (foi visto acontecendo logo após "Sair") — o campo continua
            // editável normalmente depois que o professor clica nele.
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="off"
            readOnly
            onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
            className="w-full h-11 border border-linha rounded-botao px-4 text-sm bg-superficie text-tinta focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />

          {erro && (
            <p className="text-sm text-erro flex items-center gap-1.5">
              <span aria-hidden>⚠</span>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full h-11 bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao disabled:opacity-50 flex items-center justify-center"
          >
            {carregando ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : modo === 'login' ? (
              'Entrar'
            ) : (
              'Criar conta'
            )}
          </button>

          <button
            type="button"
            onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
            className="w-full text-sm text-texto-secundario hover:text-tinta"
          >
            {modo === 'login' ? 'Criar conta nova' : 'Já tenho conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
