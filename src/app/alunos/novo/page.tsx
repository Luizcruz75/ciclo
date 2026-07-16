import { getGruposBarreiras } from '@/lib/barreiras'
import { getInteressesAgrupados } from '@/lib/interesses'
import { CadastroAlunoForm } from './CadastroAlunoForm'

export default function NovoAlunoPage() {
  const grupos = getGruposBarreiras()
  const categoriasInteresses = getInteressesAgrupados()
  return <CadastroAlunoForm grupos={grupos} categoriasInteresses={categoriasInteresses} />
}
