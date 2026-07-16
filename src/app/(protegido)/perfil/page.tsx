import { createClient } from '@/lib/supabase/server'
import { PerfilForm } from './PerfilForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let nomeAtual = ''
  if (user) {
    const { data: professor } = await supabase
      .from('professores')
      .select('nome')
      .eq('id', user.id)
      .single()
    nomeAtual = professor?.nome ?? ''
  }

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-1">
        Meu perfil
      </h1>
      <p className="text-sm text-texto-secundario mb-6">
        Esse nome aparece no cabeçalho da prova adaptada em PDF.
      </p>
      <PerfilForm nomeAtual={nomeAtual} />
    </div>
  )
}
