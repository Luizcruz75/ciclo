import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// R4 (CLAUDE.md): a chave da Anthropic nunca sai do servidor.
// O import 'server-only' quebra o build se este módulo for puxado
// para dentro de um componente client.

export const MODELOS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-5',
} as const

let clienteAnthropic: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!clienteAnthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada no ambiente do servidor.')
    }
    // maxRetries acima do padrão (2): logs de produção mostraram vários
    // 529 overloaded_error seguidos vindos da própria API da Anthropic
    // (x-should-retry: true) — não é chave, rate limit ou timeout nosso,
    // é sobrecarga transitória do lado deles. Mais tentativas com backoff
    // aumenta a chance de passar por uma janela curta de instabilidade.
    clienteAnthropic = new Anthropic({ apiKey, maxRetries: 5 })
  }
  return clienteAnthropic
}
