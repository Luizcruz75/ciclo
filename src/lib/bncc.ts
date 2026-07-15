import bnccData from '@data/bncc-ef1.json'

export type Habilidade = {
  codigo: string
  ano: number
  componente: 'MAT' | 'LP'
  unidade_tematica: string
  objeto_conhecimento: string
  descricao: string
  eh_producao_texto: boolean
  eh_leitura_interpretacao: boolean
  objeto_da_avaliacao: string
}

export type Materia = 'portugues' | 'matematica'

const COMPONENTE_POR_MATERIA: Record<Materia, Habilidade['componente']> = {
  portugues: 'LP',
  matematica: 'MAT',
}

const habilidades = bnccData.habilidades as Habilidade[]

// R2 (CLAUDE.md): lista fechada. A IA escolhe entre estes candidatos, nunca gera um código.
export function getHabilidadesCandidatas(materia: Materia, anoEscolar: number): Habilidade[] {
  const componente = COMPONENTE_POR_MATERIA[materia]
  return habilidades.filter((h) => h.componente === componente && h.ano === anoEscolar)
}

export function getHabilidadePorCodigo(codigo: string): Habilidade | undefined {
  return habilidades.find((h) => h.codigo === codigo)
}
