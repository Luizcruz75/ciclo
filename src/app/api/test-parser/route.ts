/**
 * Rota de teste do agente PARSER (versão final, com o schema corrigido).
 *
 * Onde colocar: ciclo/src/app/api/test-parser/route.ts
 * (substitui a versão de diagnóstico anterior — mesmo arquivo)
 *
 * Como usar (com "npm run dev" rodando):
 *   http://localhost:3000/api/test-parser
 *
 * ⚠️ Rota de teste temporária. Apague este arquivo (ou a pasta
 * src/app/api/test-parser/ inteira) quando terminar de validar.
 */

import { NextResponse } from "next/server";
import { parseProva } from "@/lib/agents/parser";

// Exemplo fictício de prova colada — 3º ano, Matemática + Português,
// formatação "suja" como um professor real colaria
const PROVA_FICTICIA = `
Escola Municipal Jardim das Flores
Prova de Matemática e Português - 3º Ano B
Nome: _______________________  Data: ___/___/___

1) Observe os números abaixo e responda: qual é o maior número?
a) 245
b) 198
c) 302
d) 176

2) Complete a frase com a palavra correta:
"O menino ___ para escola todos os dias."
a) vai
b) foi
c) vou
d) vamos

3) Se Maria tem 8 balas e ganhou mais 5 de sua amiga, quantas balas ela tem agora?
Resposta: __________

4) Leia o texto abaixo e responda a pergunta:
"O cachorro correu atrás do gato até o jardim, mas o gato subiu na árvore e o cachorro não conseguiu alcançá-lo."
Por que o cachorro não conseguiu pegar o gato?
_______________________________________________

5) Qual destas palavras tem 3 sílabas?
a) casa
b) computador
c) sol
d) bola
`.trim();

export async function GET() {
  const inicio = Date.now();
  const resultado = await parseProva(PROVA_FICTICIA);
  const duracaoMs = Date.now() - inicio;

  return NextResponse.json({
    duracaoMs,
    ...resultado,
  });
}
