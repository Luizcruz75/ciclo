'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function atualizarNomeProfessor(
  nome: string
): Promise<{ sucesso: true } | { sucesso: false; erro: string }> {
  const nomeTratado = nome.trim()

  if (nomeTratado.length < 2) {
    return { sucesso: false, erro: 'Informe um nome válido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  const { error } = await supabase
    .from('professores')
    .update({ nome: nomeTratado })
    .eq('id', user.id)

  if (error) {
    return { sucesso: false, erro: 'Não foi possível salvar o nome.' }
  }

  // O nome aparece no header (MenuProfessor) em toda tela logada, não só
  // em /perfil — revalida o layout inteiro para refletir a mudança.
  revalidatePath('/', 'layout')

  return { sucesso: true }
}
