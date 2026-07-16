import interessesData from '@data/interesses.json'

export type Interesse = {
  codigo: string
  nome: string
  categoria: string
}

export type CategoriaInteresses = {
  codigo: string
  nome: string
  interesses: Interesse[]
}

const interesses = interessesData.interesses as Interesse[]

export function getCodigosInteressesValidos(): Set<string> {
  return new Set(interesses.map((i) => i.codigo))
}

export function getInteressesPorCodigos(codigos: string[]): Interesse[] {
  const codigosBuscados = new Set(codigos)
  return interesses.filter((i) => codigosBuscados.has(i.codigo))
}

export function getInteressesAgrupados(): CategoriaInteresses[] {
  return interessesData.categorias
    .map((categoria) => ({
      codigo: categoria.codigo,
      nome: categoria.nome,
      interesses: interesses.filter((i) => i.categoria === categoria.codigo),
    }))
    .filter((categoria) => categoria.interesses.length > 0)
}

// Mesmo agrupamento de getInteressesAgrupados(), mas só com os interesses
// passados — usado na ficha do aluno para mostrar só os interesses
// cadastrados dele.
export function agruparInteressesPorCategoria(interessesFiltrados: Interesse[]): CategoriaInteresses[] {
  return interessesData.categorias
    .map((categoria) => ({
      codigo: categoria.codigo,
      nome: categoria.nome,
      interesses: interessesFiltrados.filter((i) => i.categoria === categoria.codigo),
    }))
    .filter((categoria) => categoria.interesses.length > 0)
}
