import 'server-only'

// Guardrail determinístico (CLAUDE.md): sanitização anti prompt-injection
// no texto colado pelo professor, antes de qualquer chamada de LLM.

const LIMITE_CARACTERES = 20_000

// Caracteres de controle, exceto tab, quebra de linha e retorno de carro.
const REGEX_CARACTERES_CONTROLE = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g')

// Defesa em profundidade: a defesa principal é estrutural (o texto do
// professor entra delimitado e é tratado como dado, nunca como instrução —
// ver lib/agents/parser.ts). Isto aqui neutraliza tentativas óbvias de
// override que apareçam dentro do texto colado.
const PADROES_SUSPEITOS = [
  /ignor[ea]\s+(todas?\s+)?(as\s+)?instru(ç|c)(õ|o)es?\s+anteriores/gi,
  /desconsidere\s+(todas?\s+)?(as\s+)?instru(ç|c)(õ|o)es?\s+anteriores/gi,
  /disregard\s+(all\s+)?(the\s+)?(previous|above)\s+instructions/gi,
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /you\s+are\s+now\s+/gi,
  /\bsystem\s*:/gi,
  /\[\/?(system|assistant|user)\]/gi,
  /<\/?(system|assistant|user)>/gi,
]

export function sanitizarTextoColado(textoBruto: string): string {
  let texto = textoBruto
    .replace(REGEX_CARACTERES_CONTROLE, '')
    .trim()
    .slice(0, LIMITE_CARACTERES)

  for (const padrao of PADROES_SUSPEITOS) {
    texto = texto.replace(padrao, '[trecho removido pelo Ciclo — instrução suspeita]')
  }

  return texto
}
