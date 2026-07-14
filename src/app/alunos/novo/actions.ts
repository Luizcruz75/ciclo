'use server'

import { createClient } from '@/lib/supabase/server'
import { derivarIniciais } from '@/lib/alunos'
import { cadastroAlunoSchema } from '@/lib/validations/aluno'

type ResultadoCadastro =
  | { sucesso: true; alunoId: string }
  | { sucesso: false; erro: string }

export async function criarAluno(input: {
  nomeCompleto: string
  anoEscolar: number
  barreiraCodigos: string[]
}): Promise<ResultadoCadastro> {
  const parsed = cadastroAlunoSchema.safeParse(input)

  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const { nomeCompleto, anoEscolar, barreiraCodigos } = parsed.data
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' }
  }

  const { data, error } = await supabase.rpc('criar_aluno_com_barreiras', {
    p_nome_completo: nomeCompleto,
    p_iniciais: derivarIniciais(nomeCompleto),
    p_ano_escolar: anoEscolar,
    p_barreira_codigos: barreiraCodigos,
  })

  if (error) {
    return { sucesso: false, erro: 'Não foi possível cadastrar o aluno. Tente novamente.' }
  }

  return { sucesso: true, alunoId: data as string }
}
