import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorProvaForm } from './EditorProvaForm'

export default async function EditorProvaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS garante que só volta se a prova pertencer ao professor logado —
  // se pertencer a outro professor, o Supabase simplesmente não retorna a
  // linha (não é um "acesso negado" explícito, é como se não existisse).
  const { data: prova, error: erroProva } = await supabase
    .from('provas')
    .select('id, titulo, materia, ano_escolar')
    .eq('id', id)
    .single()

  if (erroProva || !prova) {
    notFound()
  }

  const { data: questoes, error: erroQuestoes } = await supabase
    .from('questoes')
    .select('id, ordem, enunciado, alternativas, bncc_codigo, pontos')
    .eq('prova_id', id)
    .order('ordem')

  if (erroQuestoes) {
    notFound()
  }

  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome_completo, iniciais')
    .order('nome_completo')

  // Adaptações já existentes para essas questões, para a tela abrir já
  // mostrando o que foi feito antes (evita reprocessar tudo a cada visita).
  const questaoIds = (questoes ?? []).map((q) => q.id)
  const { data: adaptacoesExistentes } = await supabase
    .from('adaptacoes')
    .select(
      'id, questao_id, aluno_id, enunciado_adaptado, tecnicas_aplicadas, justificativa, verifier_aprovado, verifier_tentativas, verifier_alerta, editado_pelo_professor'
    )
    .in('questao_id', questaoIds.length > 0 ? questaoIds : ['00000000-0000-0000-0000-000000000000'])

  // Feedback (👍/👎) já registrado para essas adaptações — evita mostrar de
  // novo os botões "Funcionou?" numa adaptação que já recebeu evidência.
  const adaptacaoIds = (adaptacoesExistentes ?? []).map((a) => a.id)
  const { data: evidenciasExistentes } = await supabase
    .from('evidencias')
    .select('adaptacao_id, funcionou')
    .in('adaptacao_id', adaptacaoIds.length > 0 ? adaptacaoIds : ['00000000-0000-0000-0000-000000000000'])

  return (
    <EditorProvaForm
      prova={prova}
      questoes={questoes ?? []}
      alunos={alunos ?? []}
      adaptacoesExistentes={adaptacoesExistentes ?? []}
      evidenciasExistentes={evidenciasExistentes ?? []}
    />
  )
}
