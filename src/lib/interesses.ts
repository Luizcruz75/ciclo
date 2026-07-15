import interessesData from '@data/interesses.json'

export type Interesse = {
  codigo: string
  nome: string
  categoria: string
}

const interesses = interessesData.interesses as Interesse[]

export function getCodigosInteressesValidos(): Set<string> {
  return new Set(interesses.map((i) => i.codigo))
}

export function getInteressesPorCodigos(codigos: string[]): Interesse[] {
  const codigosBuscados = new Set(codigos)
  return interesses.filter((i) => codigosBuscados.has(i.codigo))
}
