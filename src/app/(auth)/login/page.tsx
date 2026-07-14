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

  async function handleSubmit() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {modo === 'login' ? 'Entrar no Ciclo' : 'Criar conta'}
        </h1>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            onClick={handleSubmit}
            disabled={carregando}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          <button
            onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            {modo === 'login' ? 'Criar conta nova' : 'Já tenho conta'}
          </button>
        </div>
      </div>
    </div>
  )
}
