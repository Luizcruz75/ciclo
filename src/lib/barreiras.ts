import barreirasData from '@data/barreiras.json'

export type Barreira = {
  codigo: string
  grupo: string
  nome_curto: string
  pergunta_gatilho: string
  tecnicas_indicadas: string[]
  tecnicas_contraindicadas: string[]
  classificacao: string
  nota?: string
  ativa: boolean
}

export type GrupoBarreiras = {
  codigo: string
  titulo: string
  barreiras: Barreira[]
}

const ORDEM_GRUPOS = ['ATN', 'EXE', 'LIN', 'SEN', 'REG', 'MOT'] as const

const barreirasAtivas = (barreirasData.barreiras as Barreira[]).filter((b) => b.ativa)

export function getGruposBarreiras(): GrupoBarreiras[] {
  return ORDEM_GRUPOS.map((codigoGrupo) => ({
    codigo: codigoGrupo,
    titulo: barreirasData.grupos[codigoGrupo as keyof typeof barreirasData.grupos],
    barreiras: barreirasAtivas.filter((b) => b.grupo === codigoGrupo),
  })).filter((grupo) => grupo.barreiras.length > 0)
}

export function getCodigosBarreirasValidos(): Set<string> {
  return new Set(barreirasAtivas.map((b) => b.codigo))
}

export function getBarreirasPorCodigos(codigos: string[]): Barreira[] {
  const codigosBuscados = new Set(codigos)
  return barreirasAtivas.filter((b) => codigosBuscados.has(b.codigo))
}
