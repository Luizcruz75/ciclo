# SDD — Documento de Design do Sistema
### Ciclo · v0.1 · escrito para quem está começando a programar

---

## Como ler este documento

Este é o **mapa técnico** do Ciclo. Se o PRD explica *o quê* e *por quê*, este documento explica **como construir**: quais telas existem, o que fica salvo no banco de dados, e por onde a informação passa.

Escrevi em linguagem simples de propósito. Sempre que um termo técnico aparecer pela primeira vez, tem uma explicação ao lado.

---

## 1. A stack — as ferramentas que vamos usar

| Ferramenta | O que ela faz | Por quê essa |
|---|---|---|
| **Next.js** | O "motor" do site. Ele monta as páginas que o professor vê e também roda código no servidor (a parte que ninguém vê, onde ficam as senhas e chaves). | É o padrão de mercado para sites com login, banco de dados e IA juntos. |
| **Supabase** | O banco de dados + login de usuário + guarda de arquivos, tudo em um serviço só. | Gratuito para começar, e já vem com **RLS** (explico já já) pronto para usar. |
| **Vercel** | O lugar onde o site fica hospedado — o "endereço" que vira link na internet. | Feito pela mesma empresa do Next.js. Publicar é literalmente um clique. |
| **Claude (Anthropic)** | A inteligência artificial que lê a prova, sugere a habilidade BNCC e adapta a questão. | Já definido no PRD — Haiku para tarefas simples, Sonnet para as que exigem julgamento. |
| **React-PDF** | Gera o arquivo PDF da prova adaptada, com o layout exato que você definir. | Layout é o produto — precisa de controle fino, não de um gerador genérico. |

**Uma peça central: o RLS.**
RLS significa *Row Level Security* — segurança em nível de linha. Na prática: cada professor só enxerga os alunos **dele**. Mesmo que dois professores usem o mesmo banco de dados, um nunca vê o aluno do outro. Isso não é uma regra escrita no código do site — é uma regra escrita **dentro do banco de dados**, que ninguém consegue burlar nem por engano. Como o PRD trata isso como obrigatório desde a primeira tabela, este documento já nasce com RLS em cada tabela.

---

## 2. As páginas do app

Pense nisso como o "mapa de navegação" — cada linha é uma tela que o usuário vai ver.

### Páginas do professor (precisa estar logado)

| Página | Endereço (rota) | O que tem nela |
|---|---|---|
| **Login / Cadastro** | `/login` | E-mail e senha. Primeira tela que qualquer um vê. |
| **Painel principal** | `/` | Lista de alunos e provas recentes. É a "home" depois do login. |
| **Lista de alunos** | `/alunos` | Todos os alunos da turma do professor. |
| **Cadastrar aluno** | `/alunos/novo` | Nome, turma, e o formulário de **barreiras** (seleção das ~8 barreiras daquele aluno) + interesses (dinossauro, futebol, etc.) + consentimento do responsável. |
| **Ficha do aluno** | `/alunos/[id]` | Perfil completo: barreiras confirmadas, histórico de evidências, botão para gerar o PEI. |
| **Nova prova** | `/provas/nova` | Onde o professor cola o texto da prova. Aciona o PARSER e o CLASSIFIER. |
| **Editor da prova** | `/provas/[id]/editor` | Tela principal de trabalho: revisar a adaptação, ajustar, escolher quais entregáveis baixar (PDF prova adaptada, gabarito, bilhete para a família, etc.). |
| **PEI do aluno** | `/pei/[alunoId]` | Documento final, gerado a partir das evidências acumuladas. |

### Página pública (sem necessidade de login)

| Página | Endereço | O que tem nela |
|---|---|---|
| **Validação do coordenador** | `/validar/[token]` | O coordenador abre pelo celular, via link enviado pelo professor, sem precisar criar conta. Vê a prova adaptada e aprova ou comenta. |

**Por que essa página não pede login:** o PRD é explícito — a validação do coordenador precisa ser rápida e sem atrito, senão ninguém usa. O "token" na URL (um código único e temporário) já garante que só quem recebeu o link acessa aquela prova específica.

---

## 3. O fluxo do usuário — a jornada completa

Vou descrever como um professor de verdade usaria o app, do primeiro dia até o fim do semestre.

### Primeiro uso (uma vez só, ~5 minutos)

```
1. Professor cria conta (e-mail + senha)
   ↓
2. Preenche o perfil da escola (nome, logo, turma)
   ↓
3. Cadastra o primeiro aluno
   → Marca o diagnóstico (TDAH, TEA nível 1/2/3) — SÓ para sugerir barreiras na tela
   → O sistema sugere barreiras com base no diagnóstico
   → O professor CONFIRMA quais barreiras realmente se aplicam
   → ⚠️ O diagnóstico nunca é salvo. Só as barreiras confirmadas.
   ↓
4. Registra o consentimento do responsável (obrigatório por lei)
```

**Por que o cadastro do aluno é obrigatório logo de cara:** o PRD chama isso de decisão consciente — perde-se um pouco de gente que desiste no cadastro, mas ganha-se qualidade de dado desde o primeiro uso. Sem aluno cadastrado, não existe evidência. Sem evidência, não existe PEI.

### Uso do dia a dia (~3 minutos, toda semana)

```
5. Professor cola o texto da prova que já escreveu
   ↓
6. O agente PARSER quebra o texto em questões organizadas
   ↓
7. O agente CLASSIFIER sugere a habilidade BNCC de cada questão
   ↓
8. Professor confirma a BNCC (1 clique por questão — nunca é automático sem revisão)
   ↓
9. Professor escolhe o aluno → o agente ADAPTER adapta a questão
   ↓
10. O agente VERIFIER audita a adaptação por trás dos panos
    (o professor nem vê essa etapa acontecer, a não ser que dê problema)
    ↓
11. Professor revisa no editor e ajusta o que quiser
    ↓
12. Escolhe quais documentos quer baixar (prova, gabarito, bilhete...)
    ↓
13. Baixa em PDF ou DOCX
```

### Validação (opcional — o professor pode pular)

```
14. Professor clica em "Enviar para validação"
    ↓
15. Sistema gera um link único e envia ao coordenador
    ↓
16. Coordenador abre no celular, sem precisar logar
    ↓
17. Aprova ou deixa um comentário
```

**Por que é opcional:** a prova já foi entregue ao aluno na etapa 13. A validação do coordenador não trava nada — ela só adiciona um selo de qualidade depois.

### A parte que vira produto (o coração do Ciclo)

```
18. Depois que o aluno faz a prova, o sistema pergunta: "Funcionou?"
    → Professor responde 👍 ou 👎, e opcionalmente a nota
    ↓
19. Essa resposta vira uma EVIDÊNCIA salva no perfil do aluno
    ↓
20. No fim do semestre, o professor clica em "Gerar PEI"
    ↓
21. O sistema junta todas as evidências daquele aluno e escreve
    o documento PEI — baseado no que realmente funcionou, não em suposição
```

---

## 4. O modelo de dados — as tabelas do Supabase

Pense em cada tabela como uma planilha gigante. Cada linha é um registro (um aluno, uma prova, uma adaptação). Cada coluna é uma informação sobre aquele registro.

**Convenção usada aqui:** `id` é sempre um código único gerado automaticamente (não precisa se preocupar em criar isso na mão). `FK` quer dizer "chave estrangeira" — é uma coluna que aponta para o `id` de outra tabela, criando a ligação entre elas.

### 4.1 Estrutura básica — escola, professor, turma

**Tabela `escolas`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `nome` | texto | Nome da escola |
| `logo_url` | texto | Link para a imagem do logo (fica salva no Storage do Supabase) |
| `criado_em` | data/hora | Quando foi cadastrada |

**Tabela `professores`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único (ligado ao login do Supabase Auth) |
| `escola_id` | uuid (FK) | A qual escola pertence |
| `email` | texto | Login |
| `nome` | texto | Nome do professor |

**Tabela `turmas`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `escola_id` | uuid (FK) | A qual escola pertence |
| `professor_id` | uuid (FK) | Professor responsável |
| `ano_escolar` | número | 1º ao 5º ano |
| `nome` | texto | Ex: "3º Ano B" |

🔒 **RLS aqui:** um professor só vê as turmas que têm `professor_id` igual ao dele.

---

### 4.2 O aluno — perfil por barreira, não por diagnóstico

Esta é a parte mais importante do banco de dados. Reflete a decisão central do produto: **guardamos o que ajuda a criança, nunca o laudo médico dela.**

**Tabela `alunos`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `turma_id` | uuid (FK) | Turma do aluno |
| `nome_completo` | texto | ⚠️ Usado **só** para escrever no PDF da prova. Nunca aparece em telas de listagem. |
| `iniciais` | texto | Usado internamente no lugar do nome completo (ex: "J.S.") |
| `diagnostico_sugestivo` | texto | 🔴 **Campo temporário.** Só existe na tela de cadastro, para sugerir barreiras. **Nunca deve ser gravado no banco de dados de verdade.** |
| `criado_em` | data/hora | Quando foi cadastrado |

**Tabela `barreiras`** *(já pronta — é o `barreiras.json` que já construímos)*
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `codigo` | texto | Ex: `ATN-01`, `LIN-03` |
| `descricao` | texto | Nome da barreira |
| `grupo` | texto | ATN, EXE, LIN, SEN, REG ou MOT |
| `fonte_id` | uuid (FK) | Aponta para a tabela `fontes` — de onde veio a validação daquela barreira |

**Tabela `aluno_barreiras`** *(a tabela que liga aluno com barreira)*
| Campo | Tipo | O que guarda |
|---|---|---|
| `aluno_id` | uuid (FK) | Qual aluno |
| `barreira_id` | uuid (FK) | Qual barreira |
| `confirmada_por` | uuid (FK → professores) | ⭐ O **professor** que confirmou — nunca a IA sozinha |
| `confirmada_em` | data/hora | Quando confirmou |

**Tabela `interesses`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `aluno_id` | uuid (FK) | Qual aluno |
| `tema` | texto | Ex: "dinossauro", "futebol" — vem de uma lista curada, não texto livre |

---

### 4.3 A prova original

**Tabela `provas`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `professor_id` | uuid (FK) | Quem criou |
| `titulo` | texto | Nome da prova |
| `materia` | texto | Português ou Matemática |
| `ano_escolar` | número | 1º ao 5º |
| `texto_original` | texto longo | O que o professor colou |
| `eh_template` | verdadeiro/falso | Se pode ser reaproveitada em outro ano |
| `criado_em` | data/hora | Quando foi criada |

**Limite de questões por prova.** O PARSER (agente que quebra o texto colado em questões) tem um teto de tokens de resposta por chamada de IA — colar uma prova enorme demais pode fazer a resposta ser cortada no meio e quebrar o processamento. Por isso a tela `/provas/nova` aplica dois níveis:

- **Acima de 15 questões:** aviso, não bloqueia. *"Identificamos X questões — processar pode levar um pouco mais de tempo."* Cobre provas de recuperação e simulados maiores, que existem de verdade.
- **Acima de 25 questões:** bloqueia, com mensagem pedindo para revisar o texto colado. Nessa faixa, é muito mais provável que o professor tenha colado dois documentos juntos por engano do que uma prova real de Ensino Fundamental I — que costuma ter entre 5 e 15 questões.

Os dois números (15 e 25) vivem como constantes em `src/lib/pipeline-prova.ts`, não no banco — são regra de produto, não dado de configuração por escola.

**Tabela `questoes`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `prova_id` | uuid (FK) | A qual prova pertence |
| `ordem` | número | Posição na prova (1ª, 2ª questão...) |
| `enunciado` | texto | O texto da pergunta |
| `alternativas` | json | Lista de alternativas, se houver |
| `bncc_codigo` | texto (FK) | Aponta para a tabela `bncc_habilidades` — **nunca texto livre**, sempre um código que já existe na lista |
| `bncc_confirmado_por` | uuid (FK → professores) | O professor que confirmou aquela BNCC |
| `pontos` | número | Valor da questão |

**Tabela `bncc_habilidades`** *(o dataset que vamos construir a seguir)*
| Campo | Tipo | O que guarda |
|---|---|---|
| `codigo` | texto | Ex: `EF03MA05` |
| `ano` | número | Ano escolar |
| `componente` | texto | PT ou MAT |
| `descricao` | texto | O texto oficial da habilidade |
| `unidade_tematica` | texto | Classificação da BNCC |

---

### 4.4 A adaptação — o centro do produto

**Tabela `adaptacoes`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `questao_id` | uuid (FK) | Questão original |
| `aluno_id` | uuid (FK) | Para qual aluno foi adaptada |
| `enunciado_adaptado` | texto | O novo texto da questão |
| `tecnicas_aplicadas` | lista de texto | Ex: `['campo_semantico', '1_questao_pagina']` |
| `justificativa` | texto | Por que a IA fez essa mudança — **isso vira linha do PEI depois** |
| `barreiras_atendidas` | lista de uuid | Quais barreiras essa adaptação resolveu |
| `verifier_aprovado` | verdadeiro/falso | Se o agente VERIFIER aprovou |
| `verifier_tentativas` | número | Quantas vezes tentou (máximo 3) |
| `verifier_alerta` | texto | Preenchido só se reprovou nas 3 tentativas — o alerta vermelho que o professor vê |
| `editado_pelo_professor` | verdadeiro/falso | Se o professor mudou algo |
| `diff_edicao` | texto | ⭐⭐ **O campo mais valioso do sistema.** O que exatamente o professor corrigiu. |
| `criado_em` | data/hora | Quando foi gerada |

**Por que `diff_edicao` é tão importante:** se 40 professores diferentes corrigem a mesma coisa na adaptação, isso é um sinal claro e gratuito de que o prompt da IA está errado em algum ponto. Nenhum concorrente coleta esse dado.

---

### 4.5 Validação do coordenador

**Tabela `validacoes`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `adaptacao_id` | uuid (FK) | Qual adaptação está sendo validada |
| `token` | uuid | Código único usado no link — expira em 7 dias, uso único |
| `coordenador_nome` | texto | Nome de quem validou |
| `status` | texto | `pendente`, `aprovado` ou `com_ressalva` |
| `comentario` | texto | Observação do coordenador |
| `validado_em` | data/hora | Quando validou |

---

### 4.6 Evidência — o que faz o produto ser diferente

**Tabela `evidencias`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `aluno_id` | uuid (FK) | Qual aluno |
| `adaptacao_id` | uuid (FK) | Qual adaptação está sendo avaliada |
| `funcionou` | verdadeiro/falso | 👍 ou 👎 |
| `aluno_concluiu_sozinho` | verdadeiro/falso | Métrica de autonomia |
| `tempo_gasto_min` | número | Quanto tempo levou |
| `nota_obtida` | número | Nota do aluno naquela prova |
| `nota_turma_media` | número | ⭐⭐ Média da turma na mesma prova — permite comparar se o aluno acompanhou |
| `observacao_professor` | texto | Comentário livre |
| `registrado_em` | data/hora | Quando foi registrado |

---

### 4.7 PEI — o documento final

**Tabela `pei`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `aluno_id` | uuid (FK) | De qual aluno |
| `periodo` | texto | Ex: "1º semestre 2026" |
| `conteudo_gerado` | texto longo | O documento PEI completo |
| `evidencias_usadas` | lista de uuid | Quais evidências entraram na geração — rastreabilidade total |
| `gerado_em` | data/hora | Quando foi gerado |

---

### 4.8 LGPD e embasamento — tabelas de apoio

**Tabela `consentimentos`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `aluno_id` | uuid (FK) | Qual aluno |
| `responsavel_nome` | texto | Quem consentiu |
| `data` | data/hora | Quando |
| `ip` | texto | Endereço de onde veio o consentimento (comprovação) |
| `texto_versao` | texto | Qual versão do termo foi aceita |

**Tabela `fontes`**
| Campo | Tipo | O que guarda |
|---|---|---|
| `id` | uuid | Identificador único |
| `tipo` | texto | `lei`, `artigo`, `diretriz` ou `norma_tecnica` |
| `titulo` | texto | Nome do documento |
| `url` | texto | Link |
| `citacao_abnt` | texto | Referência formatada |
| `arquivo_local` | texto | Caminho do arquivo salvo em `/docs/embasamento/` |

---

## 5. Como as peças se conectam — visão geral

```
PROFESSOR faz login
   │
   ▼
Cadastra ALUNO → confirma BARREIRAS (não o diagnóstico)
   │
   ▼
Cola o texto da PROVA
   │
   ▼
PARSER quebra em QUESTÕES → CLASSIFIER sugere BNCC → professor confirma
   │
   ▼
ADAPTER cria a ADAPTAÇÃO (usando as barreiras do aluno)
   │
   ▼
VERIFIER audita a ADAPTAÇÃO (aprova, retenta ou alerta)
   │
   ▼
Professor baixa PDF/DOCX ──────► (opcional) envia link de VALIDAÇÃO ao coordenador
   │
   ▼
Depois da prova: professor registra a EVIDÊNCIA (funcionou? nota?)
   │
   ▼
Fim do semestre: gera o PEI a partir de todas as EVIDÊNCIAS daquele aluno
```

---

## 6. O que este documento **não** cobre (de propósito)

Este é o design das **telas e do banco de dados**. Ele não entra em:

- Como os agentes de IA são programados por dentro (isso é o `orchestrator.ts` e os arquivos em `lib/agents/` — outro documento, quando chegar a hora)
- O texto exato de cada prompt enviado à IA
- O visual das páginas (cores, fontes) — isso é decisão de design, vem depois

**Por que isso importa agora:** o `CLAUDE.md` do projeto é claro — ainda estamos na **F0**, e faltam dois bloqueadores antes de começar a programar de verdade: o dataset da BNCC e o `fonte_id` de cada barreira. Este SDD serve para você **enxergar o projeto inteiro**, mesmo sem codar uma linha ainda.
