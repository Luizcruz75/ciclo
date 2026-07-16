'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function MenuProfessor({ nome }: { nome: string }) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fecha ao clicar fora ou pressionar Escape — só liga os listeners
  // enquanto o menu está aberto.
  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    function aoPressionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoPressionarTecla)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoPressionarTecla)
    }
  }, [aberto])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="h-11 px-3 inline-flex items-center gap-1.5 rounded-botao text-sm font-medium text-tinta hover:bg-linha/50 transition-colors duration-150 focus-visible:outline-none focus-visible:border focus-visible:border-indigo focus-visible:ring-2 focus-visible:ring-indigo/15"
      >
        {nome}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] py-1 z-10">
          <Link
            href="/perfil"
            onClick={() => setAberto(false)}
            className="w-full text-left h-11 px-3 flex items-center text-sm text-tinta hover:bg-linha/50 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-linha/50"
          >
            Meu perfil
          </Link>
          <button
            type="button"
            onClick={sair}
            className="w-full text-left h-11 px-3 flex items-center text-sm text-tinta hover:bg-erro/[0.08] hover:text-erro transition-colors duration-150 focus-visible:outline-none focus-visible:bg-erro/[0.08] focus-visible:text-erro"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
