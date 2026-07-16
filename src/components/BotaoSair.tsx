'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export function BotaoSair() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={sair} className="text-sm text-texto-secundario hover:text-tinta">
      Sair
    </button>
  )
}
