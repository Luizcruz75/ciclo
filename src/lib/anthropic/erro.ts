import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Antes desta função, toda falha na chamada ao Anthropic virava a mesma
// mensagem genérica ("Falha ao chamar o modelo de IA") em todos os agentes,
// e 4 dos 5 nem logavam o erro original (catch {} sem parâmetro) — tornando
// impossível diferenciar chave inválida, rate limit, timeout ou instabilidade
// do lado da Anthropic sem acesso aos logs de produção. Esta função classifica
// o erro real da SDK e devolve uma mensagem específica para o professor +
// um detalhe completo para console.error (visível nos logs da Vercel).
export function descreverErroAnthropic(erro: unknown): { mensagem: string; detalhe: string } {
  if (erro instanceof Anthropic.AuthenticationError) {
    return {
      mensagem: 'A chave de API da Anthropic está inválida ou expirada. Avise o administrador do sistema.',
      detalhe: `AuthenticationError (401): ${erro.message}`,
    }
  }

  if (erro instanceof Anthropic.RateLimitError) {
    return {
      mensagem: 'O limite de uso da API de IA foi atingido. Aguarde alguns minutos e tente novamente.',
      detalhe: `RateLimitError (429): ${erro.message}`,
    }
  }

  if (erro instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      mensagem: 'O modelo de IA demorou demais para responder. Tente novamente.',
      detalhe: `APIConnectionTimeoutError: ${erro.message}`,
    }
  }

  if (erro instanceof Anthropic.APIConnectionError) {
    return {
      mensagem: 'Não foi possível conectar ao serviço de IA. Verifique a conexão e tente novamente.',
      detalhe: `APIConnectionError: ${erro.message}`,
    }
  }

  if (erro instanceof Anthropic.APIError) {
    return {
      mensagem:
        erro.status && erro.status >= 500
          ? 'O serviço de IA está instável no momento. Tente novamente em instantes.'
          : 'Falha ao chamar o modelo de IA. Tente novamente em instantes.',
      detalhe: `APIError (status ${erro.status ?? 'desconhecido'}): ${erro.message}`,
    }
  }

  return {
    mensagem: 'Falha ao chamar o modelo de IA. Tente novamente em instantes.',
    detalhe: erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro),
  }
}
