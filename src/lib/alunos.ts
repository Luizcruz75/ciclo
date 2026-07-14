export function derivarIniciais(nomeCompleto: string): string {
  return nomeCompleto
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0]?.toUpperCase())
    .filter(Boolean)
    .join('.') + '.'
}
