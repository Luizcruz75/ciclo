import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// "/" nunca renderiza nada — só decide destino: sem sessão vai para
// /login (mesma checagem de middleware.ts); logado vai para /painel.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  redirect('/painel')
}
