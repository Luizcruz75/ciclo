import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PainelPage() {
  const supabase = await createClient()

  // RLS já garante que só voltam os alunos do professor logado.
  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome_completo, ano_escolar')
    .order('nome_completo')

  const alunoIds = (alunos ?? []).map((a) => a.id)
  const { data: evidencias } = await supabase
    .from('evidencias')
    .select('aluno_id')
    .in('aluno_id', alunoIds.length > 0 ? alunoIds : ['00000000-0000-0000-0000-000000000000'])

  const contagemPorAluno: Record<string, number> = {}
  for (const e of evidencias ?? []) {
    contagemPorAluno[e.aluno_id as string] = (contagemPorAluno[e.aluno_id as string] ?? 0) + 1
  }

  const temAlunos = (alunos ?? []).length > 0

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta mb-8">
        Painel
      </h1>

      {!temAlunos ? (
        <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm text-texto-secundario mb-4">
            Você ainda não tem nenhum aluno cadastrado.
          </p>
          <Link
            href="/alunos/novo"
            className="inline-flex h-11 px-4 items-center justify-center bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao"
          >
            Cadastrar meu primeiro aluno
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <Link
              href="/provas/nova"
              className="h-10 px-4 inline-flex items-center justify-center bg-indigo hover:bg-indigo-escuro text-white text-sm font-medium rounded-botao"
            >
              Nova prova
            </Link>
            <Link
              href="/alunos/novo"
              className="h-10 px-4 inline-flex items-center justify-center border border-indigo text-indigo text-sm font-medium rounded-botao"
            >
              Cadastrar novo aluno
            </Link>
          </div>

          <div className="space-y-3">
            {(alunos ?? []).map((aluno) => {
              const evidenciasCount = contagemPorAluno[aluno.id] ?? 0
              return (
                <Link
                  key={aluno.id}
                  href={`/alunos/${aluno.id}`}
                  className="block bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4 hover:border-indigo transition-colors"
                >
                  <p className="text-sm font-medium text-tinta">{aluno.nome_completo}</p>
                  <p className="text-[13px] text-texto-secundario mt-0.5">
                    {aluno.ano_escolar}º ano · {evidenciasCount}{' '}
                    {evidenciasCount === 1 ? 'evidência registrada' : 'evidências registradas'}
                  </p>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
