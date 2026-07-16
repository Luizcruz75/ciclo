import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBarreirasPorCodigos, agruparBarreirasPorFamilia } from '@/lib/barreiras'
import { getInteressesPorCodigos, agruparInteressesPorCategoria } from '@/lib/interesses'
import { Breadcrumb } from '@/components/Breadcrumb'

export default async function FichaAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS garante que só volta se o aluno pertencer ao professor logado — se
  // pertencer a outro professor, o Supabase simplesmente não retorna a
  // linha (mesmo comportamento já validado em /provas/[id]/editor).
  const { data: aluno, error: erroAluno } = await supabase
    .from('alunos')
    .select('id, nome_completo, ano_escolar')
    .eq('id', id)
    .single()

  if (erroAluno || !aluno) {
    notFound()
  }

  const { data: barreirasAluno } = await supabase
    .from('barreiras_aluno')
    .select('barreira_codigo')
    .eq('aluno_id', id)

  const { data: interessesAluno } = await supabase
    .from('interesses_aluno')
    .select('interesse_codigo')
    .eq('aluno_id', id)

  const { data: evidencias } = await supabase
    .from('evidencias')
    .select('id, funcionou, nota_obtida, nota_turma_media, criado_em')
    .eq('aluno_id', id)
    .order('criado_em', { ascending: false })

  const barreirasCodigos = (barreirasAluno ?? []).map((b) => b.barreira_codigo as string)
  const interessesCodigos = (interessesAluno ?? []).map((i) => i.interesse_codigo as string)

  const gruposBarreiras = agruparBarreirasPorFamilia(getBarreirasPorCodigos(barreirasCodigos))
  const categoriasInteresses = agruparInteressesPorCategoria(getInteressesPorCodigos(interessesCodigos))

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Breadcrumb atual={aluno.nome_completo} />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-tinta">
            {aluno.nome_completo}
          </h1>
          <p className="text-sm text-texto-secundario mt-1">{aluno.ano_escolar}º ano</p>
        </div>

        {/* PEI-WRITER ainda não existe (ver CLAUDE.md — próximo agente do
            orquestrador a ser construído). Botão fica visível, desabilitado,
            para o fluxo já ter um lugar reservado quando o agente chegar. */}
        <button
          type="button"
          disabled
          title="Em breve — o PEI-WRITER ainda não foi implementado"
          className="h-10 px-4 rounded-botao text-sm font-medium bg-indigo text-white opacity-40 cursor-not-allowed shrink-0"
        >
          Gerar PEI
        </button>
      </div>

      <div className="space-y-6">
        <Secao titulo="Barreiras confirmadas">
          {gruposBarreiras.length === 0 ? (
            <EstadoVazio texto="Nenhuma barreira confirmada." />
          ) : (
            <div className="space-y-3">
              {gruposBarreiras.map((grupo) => (
                <fieldset
                  key={grupo.codigo}
                  className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4"
                >
                  <legend className="text-[13px] font-medium text-tinta px-1">{grupo.titulo}</legend>
                  <div className="space-y-2 mt-2">
                    {grupo.barreiras.map((barreira) => (
                      <div key={barreira.codigo} className="text-sm text-tinta">
                        <span className="font-medium">{barreira.nome_curto}</span>
                        <br />
                        <span className="text-texto-secundario">{barreira.pergunta_gatilho}</span>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </Secao>

        <Secao titulo="Interesses">
          {categoriasInteresses.length === 0 ? (
            <EstadoVazio texto="Nenhum interesse cadastrado." />
          ) : (
            <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4 space-y-3">
              {categoriasInteresses.map((categoria) => (
                <div key={categoria.codigo}>
                  <p className="text-[13px] font-medium text-tinta mb-1.5">{categoria.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {categoria.interesses.map((interesse) => (
                      <span
                        key={interesse.codigo}
                        className="text-sm px-3 py-1.5 rounded-botao border border-linha text-tinta"
                      >
                        {interesse.nome}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Secao>

        <Secao titulo="Histórico de evidências">
          {(evidencias ?? []).length === 0 ? (
            <EstadoVazio texto="Nenhuma evidência registrada ainda — vai aparecer aqui conforme as adaptações forem usadas em sala." />
          ) : (
            <div className="space-y-2">
              {(evidencias ?? []).map((evidencia) => (
                <div
                  key={evidencia.id}
                  className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4 text-sm text-tinta"
                >
                  <span>{evidencia.funcionou ? 'Funcionou' : 'Não funcionou'}</span>
                  {evidencia.nota_obtida !== null && (
                    <span className="text-texto-secundario">
                      {' '}
                      — nota {evidencia.nota_obtida}
                      {evidencia.nota_turma_media !== null && ` (turma: ${evidencia.nota_turma_media})`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Secao>
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-tinta mb-3">{titulo}</label>
      {children}
    </div>
  )
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="bg-superficie border border-linha rounded-card shadow-[var(--shadow-card)] p-4 text-sm text-texto-secundario">
      {texto}
    </div>
  )
}
