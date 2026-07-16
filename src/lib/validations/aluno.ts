import { z } from 'zod'
import { getCodigosBarreirasValidos } from '@/lib/barreiras'
import { getCodigosInteressesValidos } from '@/lib/interesses'

export const cadastroAlunoSchema = z.object({
  nomeCompleto: z
    .string()
    .trim()
    .min(2, 'Informe o nome completo do aluno.'),
  anoEscolar: z.coerce
    .number()
    .int()
    .min(1, 'Ano escolar deve estar entre 1 e 5.')
    .max(5, 'Ano escolar deve estar entre 1 e 5.'),
  barreiraCodigos: z
    .array(z.string())
    .min(1, 'Selecione ao menos uma barreira.')
    .refine(
      (codigos) => {
        const validos = getCodigosBarreirasValidos()
        return codigos.every((c) => validos.has(c))
      },
      { message: 'Uma ou mais barreiras selecionadas não existem na lista.' }
    ),
  // Interesse é opcional — nem todo aluno precisa ter um cadastrado, diferente
  // de barreira (que é o motivo do cadastro existir).
  interesseCodigos: z
    .array(z.string())
    .default([])
    .refine(
      (codigos) => {
        const validos = getCodigosInteressesValidos()
        return codigos.every((c) => validos.has(c))
      },
      { message: 'Um ou mais interesses selecionados não existem na lista.' }
    ),
  consentimentoResponsavel: z
    .boolean()
    .refine((v) => v === true, {
      message: 'É necessário confirmar o consentimento do responsável.',
    }),
})

export type CadastroAlunoInput = z.infer<typeof cadastroAlunoSchema>
