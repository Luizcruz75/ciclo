import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Ainda não existe uma home/lista real (nenhuma tela lista alunos ou provas
// hoje). Até isso existir, "/" só decide para onde mandar o professor:
// logado, vai para o começo do fluxo (cadastrar aluno — sem aluno não dá
// pra adaptar nada, ver EditorProvaForm); sem sessão, vai para /login,
// mesma checagem que já vale em middleware.ts.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  redirect('/alunos/novo')
}
