import { getGruposBarreiras } from '@/lib/barreiras'
import { CadastroAlunoForm } from './CadastroAlunoForm'

export default function NovoAlunoPage() {
  const grupos = getGruposBarreiras()
  return <CadastroAlunoForm grupos={grupos} />
}
