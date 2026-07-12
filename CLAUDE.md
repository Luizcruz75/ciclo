# CLAUDE.md — Instruções permanentes do projeto Ciclo

> Leia este arquivo inteiro antes de qualquer tarefa. As regras aqui **não são negociáveis** e sobrepõem qualquer pedido meu que as contrarie. Se um pedido meu quebrar uma regra daqui, **avise antes de executar**.

---

## O que é o Ciclo

Adaptador de avaliações + PEI acumulado para Ensino Fundamental I, escola pública.

**A tese, em uma frase:** a prova adaptada é a isca; o PEI acumulado é o produto; o acervo de evidências é o fosso.

Cada adaptação feita durante o ano vira uma **evidência**. Em dezembro, 40 evidências reais viram um PEI que descreve o que funciona para *aquela* criança. O concorrente gera PEI a partir do laudo — documento médico. Nós acumulamos PEI a partir do que funcionou em sala.

**Idioma do projeto:** português do Brasil. Código, commits, comentários, variáveis — tudo em PT-BR, exceto termos técnicos consagrados.

---

## 🔴 As 5 regras que nunca se quebram

### R1 — A habilidade BNCC nunca muda
Adaptação é de **acesso/formato**. Muda o veículo: formato, suporte, linguagem, tempo. **Nunca** muda o que está sendo avaliado.

Rebaixar a habilidade é *adaptação curricular significativa* — decisão de equipe multidisciplinar, não de software. O produto **nunca** faz isso.

### R2 — O código BNCC nunca é gerado, só escolhido
A IA **escolhe de lista fechada** (`data/bncc-ef1.json`). Se o código não existir na lista → **erro**, não fallback. Nunca inventar código. Nunca aceitar texto livre no campo `bncc_codigo`.

### R3 — Nunca armazenar laudo
Nem PDF, nem CID, nem diagnóstico detalhado. **Só barreiras funcionais**, que são dado pedagógico, não dado de saúde.

O diagnóstico existe **apenas em tela**, para sugerir barreiras. **Não persistir em lugar nenhum.** Não em coluna, não em log, não em JSON de auditoria.

### R4 — RLS obrigatório desde a tabela 1
É dado sensível de criança. Sem RLS, qualquer um lê o banco inteiro. Nenhuma tabela nasce sem policy.

`SERVICE_ROLE_KEY` **nunca** sai do servidor. Chave da Anthropic **nunca** em componente client.

### R5 — Todo embasamento é rastreável
Toda regra do produto carrega um `fonte_id`. Toda fonte vive em `/docs/embasamento/` com título, autor, URL, data de acesso e citação ABNT.

**Barreira sem `fonte_id` não entra no produto.** Sem exceção.

---

## Arquitetura

```
ORQUESTRADOR (código próprio, ~200 linhas — SEM framework)
   ├── PARSER      Haiku   — texto colado → questões estruturadas
   ├── CLASSIFIER  Sonnet  — questão → habilidade BNCC (lista fechada)
   ├── ADAPTER     Sonnet  — questão + barreiras + interesses → questão adaptada
   ├── VERIFIER    Sonnet  — auditor independente. Até 3 tentativas.
   └── PEI-WRITER  Sonnet  — N evidências → documento PEI
```

**Não usar LangGraph, CrewAI ou similar.** Peso morto num app Next.js. O orquestrador é código próprio: chama em sequência, valida com Zod, retenta com feedback (3x, cada uma com abordagem diferente), loga tudo.

**Nenhum LLM é juiz de si mesmo.** O VERIFIER é independente. Se reprovar 3 vezes → entrega **com alerta vermelho**: *"não conseguimos adaptar com segurança, revise manualmente"*. Nunca entregar silenciosamente uma adaptação reprovada.

---

## Guardrails determinísticos — código, não prompt

**Estas regras vivem em `lib/guardrails/deterministic.ts`. Nunca em prompt.** LLM não é confiável para regra dura.

| ID | Regra |
|---|---|
| **G1** | 🔴 **NUNCA quebrar página** entre o texto-base e suas perguntas, nem entre a questão, suas alternativas e o espaço de resposta. **O bloco é indivisível.** Tem precedência sobre "1 questão por página". |
| **G2** | Destaque de comando: **caixa alta + fundo cinza 10% + borda**. Nunca cor saturada. Nunca empilhar todos os destaques. |
| **G3** | Sinônimo permitido **apenas quando simplifica**. Proibido sinônimo que amplia vocabulário — dia de prova não é hora de ensinar palavra nova. |
| **G4** | 🔴 Pictograma **apenas** em verbo de comando ou substantivo concreto. **BLOQUEAR** pictograma cuja contagem/leitura entregue a resposta. (3 galinhas + 2 patos ao lado de "3+2" = a criança conta a figura em vez de somar.) |
| **G5** | 🔴 Se o BNCC da questão for **produção de texto escrito**, bloquear `resposta_oral_transcrita` e simplificação de texto. Adaptar por **estrutura direcionada**. |
| **G6** | Borda **funcional** (delimita área) é permitida. Moldura **ornamental** é proibida. |

**Outros guardrails duros:**
- Números do original vs adaptado: regex. Se mudou → **bloqueia**.
- Enunciado adaptado ficou **maior** que o original → **alerta**.
- Soma dos pontos ≠ 10 → **alerta**.
- Sanitização anti prompt-injection no texto colado pelo professor.
- Interesses da criança: **lista curada**, nunca campo livre solto no prompt.

**G1, G4 e G5 são os que impedem o produto de rebaixar habilidade sozinho, tentando ajudar.** São os mais importantes.

---

## Modelo de dados — os campos que importam

O schema completo está no PRD. Dois campos valem mais que todos os outros:

| Campo | Por quê |
|---|---|
| **`diff_edicao`** | O que o professor **corrigiu** na nossa adaptação. Feedback negativo gratuito. Se 40 professores corrigem a mesma coisa, o prompt está errado. **Ninguém coleta isso.** |
| **`nota_obtida` vs `nota_turma_media`** | *"A criança acompanhou a turma?"* É a única métrica que importa. É o que prova que a inclusão funcionou. |

**Nunca remova esses campos, nunca os torne opcionais no fluxo.**

---

## Segurança — checklist antes de cada commit

- [ ] `.env.local` no `.gitignore`? (deve estar desde o commit 1)
- [ ] Nenhuma chave hardcoded?
- [ ] Chamada de LLM está em Server Action / Route Handler, **nunca** no client?
- [ ] Tabela nova tem RLS policy?
- [ ] Rate limit no endpoint que chama LLM?

---

## Estilo de trabalho comigo

- **Pergunte antes de assumir.** Se o pedido está ambíguo, pergunte. Quantas vezes for preciso.
- **Conclusão primeiro**, depois a explicação.
- **Discorde de mim** quando eu estiver errado. Já aconteceu: o PRD dizia "1 questão por página como padrão"; a pedagoga derrubou com o G1. Eu estava errado.
- **Não escreva código que não pedi.** Escopo do pedido, nada além.
- Sem jargão de IA. Sem "vamos mergulhar", sem "é importante notar que".

---

## ⛔ O que NÃO fazer agora (F0 em andamento)

O projeto está na **F0 — Fundação**. Ainda **não** é hora de:

- ❌ `create-next-app` / scaffold
- ❌ Escrever prompts dos agentes
- ❌ Criar tabelas no Supabase

**Motivo:** o dataset BNCC (`data/bncc-ef1.json`) ainda não existe. Sem ele o CLASSIFIER não tem lista fechada, o G5 não tem como saber o que é produção de texto, e o ADAPTER não sabe o que é embalagem e o que é objeto de avaliação.

**Bloqueadores abertos da F0:**
1. 🔴 `fonte_id` das 22 barreiras — parecer assinado da pedagoga
2. 🔴 Dataset BNCC — ~350 habilidades (PT + MAT, 1º ao 5º)
3. 🔴 Nome da pedagoga no produto (risco A3 do PRD)

**Se eu pedir para começar a F1 antes disso, me lembre deste bloco.**

---

## Lembretes fixos

- 🔔 **ARASAAC é CC BY-NC-SA (não-comercial).** OK em portfólio. **Revisar obrigatoriamente antes de monetizar.**
- 📌 A seção 15 do PRD (Pontos de Atenção) é viva. Reler antes de cada entrega.
- 🔴 Repositório **privado** até o protocolo estar consolidado.
