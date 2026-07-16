import { createClient } from '@/lib/supabase/server'
import { Header } from './Header'

// Header persistente para toda tela logada. Middleware já garante que só
// usuário autenticado chega aqui — este layout não repete a checagem de
// sessão, só busca o nome do professor (para o menu à direita) e monta o
// chrome visual comum.
export default async function LayoutProtegido({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let nomeProfessor = ''
  if (user) {
    const { data: professor } = await supabase
      .from('professores')
      .select('nome')
      .eq('id', user.id)
      .single()
    nomeProfessor = professor?.nome ?? ''
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header nomeProfessor={nomeProfessor} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
