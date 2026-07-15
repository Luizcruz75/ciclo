/**
 * Script de teste isolado do agente PARSER.
 *
 * Como rodar (no terminal, dentro da pasta do projeto ciclo/):
 *   npx tsx scripts/test-parser.ts
 *
 * Não sobe o Next.js, não usa Turbopack — só executa a função direto no Node.
 * Coloque este arquivo em: ciclo/scripts/test-parser.ts
 *
 * IMPORTANTE: confira o caminho do import abaixo. Se o seu parser.ts
 * exporta parseProva de forma diferente, ajuste a linha de import.
 */

import { parseProva } from "../src/lib/agents/parser";

// Exemplo fictício de prova colada — 3ª ano, Matemática + Língua Portuguesa,
// formatação "suja" como um professor real colaria (sem padronização perfeita)
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

async function main() {
  console.log("=== Teste do agente PARSER ===\n");
  console.log("Input (primeiras 100 chars):", PROVA_FICTICIA.slice(0, 100), "...\n");

  const inicio = Date.now();

  try {
    const resultado = await parseProva(PROVA_FICTICIA);
    const duracaoMs = Date.now() - inicio;

    console.log(`✅ Sucesso em ${duracaoMs}ms\n`);
    console.log("Questões extraídas:", JSON.stringify(resultado, null, 2));

    // Checagens básicas de sanidade — ajuste conforme o schema real do Zod
    if (Array.isArray(resultado)) {
      console.log(`\n📊 Total de questões parseadas: ${resultado.length}`);
      console.log(`📊 Esperado: 5 questões (baseado no input fictício)`);
    }
  } catch (erro) {
    const duracaoMs = Date.now() - inicio;
    console.error(`❌ Falhou após ${duracaoMs}ms\n`);
    console.error(erro);
    process.exit(1);
  }
}

main();
