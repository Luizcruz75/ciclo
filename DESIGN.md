# DESIGN.md — Design System do Ciclo
### v0.1 · minimalista / moderno / light

---

## Como ler este documento

Isto não é um wireframe. É o **vocabulário visual** do app — as regras que fazem qualquer tela nova parecer que já nasceu dentro do Ciclo, sem você ter que reinventar cor e espaçamento a cada componente.

**A ideia central do visual:** o produto *é* sobre clareza para quem tem dificuldade de processar informação. A interface do professor precisa praticar o que a prova adaptada prega — pouca poluição, hierarquia óbvia, nada competindo por atenção ao mesmo tempo.

---

## 1. Paleta de cores

A cor de destaque do produto (`--color-accent`) não foi escolhida por moda — é a **mesma cor da "tarja" que o Ciclo usa para destacar comando nas provas adaptadas** (regra de cor do PRD, §6). O app usa a própria técnica do produto na própria interface. É a assinatura visual.

| Cor | Hex | Função |
|---|---|---|
| **Tinta** (texto principal) | `#1C1D21` | Texto de corpo, títulos. Nunca preto puro — mais suave na leitura longa. |
| **Papel** (fundo) | `#FAFAF9` | Fundo padrão de toda tela. Neutro, quase branco, sem tom amarelado de "cream". |
| **Superfície** (cards) | `#FFFFFF` | Fundo de card, modal, input — sempre um degrau mais claro que o fundo da página. |
| **Índigo** (marca / ação primária) | `#3A3ED1` | Botão primário, links, ícone ativo, foco de navegação. É a cor de "isso é clicável". |
| **Índigo escuro** (hover) | `#2C2FA8` | Estado de hover/pressed do índigo. |
| **Sálvia** (sucesso / evidência positiva) | `#4C8B6E` | 👍 "funcionou", aprovação do coordenador, confirmações. Verde não-neon, verde de crescimento, não de "sistema". |
| **Terracota suave** (alerta) | `#C4633B` | Alerta do VERIFIER (reprovou 3x), avisos que pedem atenção mas não são erro de sistema. |
| **Vermelho** (erro / bloqueio) | `#B3261E` | Erro de formulário, RLS negado, ação destrutiva (excluir aluno). Uso raro, de propósito. |
| **Tarja** (destaque / assinatura) | `#FFC94A` | ⭐ A cor do produto. Usada em highlight de texto, badge "Rascunho pedagógico", indicador do que precisa de atenção do professor. **Nunca usada como fundo de botão de ação — só como marcador.** |
| **Linha** (bordas, divisores) | `#E4E4E7` | Borda de card, input, divisor de seção. |
| **Texto secundário** | `#6B6D76` | Legenda, metadado, texto de apoio — nunca o texto principal de uma frase importante. |

**A regra que vem do próprio PRD, aplicada aqui também:** cor carrega **ênfase**, nunca **informação única**. Nenhum estado do app é comunicado só por cor — sempre cor + ícone ou cor + texto. Se um dia a tela for impressa em P&B ou vista por alguém daltônico, ainda precisa fazer sentido.

---

## 2. Tipografia

| Papel | Fonte | Peso | Uso |
|---|---|---|---|
| **Display** (títulos, nome do app) | **Fraunces** | 500–600 | Título de página, nome "Ciclo" no header, título do PEI gerado. Uma serifada com personalidade — o produto lida com texto pedagógico sério, não precisa parecer um SaaS genérico. Usar com moderação: só em títulos de nível 1. |
| **Corpo** (tudo o resto) | **Inter** | 400–500 | Parágrafo, label de formulário, botão, tabela, menu. Sem serifa, alta legibilidade em telas pequenas — professor frequentemente usa no celular. |
| **Dados / código** (BNCC, `diff_edicao`, logs) | **IBM Plex Mono** | 400 | Código de habilidade (`EF03MA05`), timestamps, qualquer coisa que precise de alinhamento tabular. |

### Escala

| Nível | Tamanho | Peso | Onde |
|---|---|---|---|
| Display | 32px / 40px (mobile/desktop) | 600 | Título de página (Fraunces) |
| H1 | 24px | 600 | Título de seção |
| H2 | 18px | 600 | Título de card |
| Corpo | 15px | 400 | Texto padrão |
| Pequeno | 13px | 400 | Legenda, metadado |
| Micro | 11px | 500, caixa alta, tracking +0.04em | Label de campo, tag de status |

**Entrelinha:** 1.5 no corpo — a mesma regra da barreira SEN-03, aplicada à própria interface.

---

## 3. Estilo visual — os princípios

1. **Um card, uma decisão.** Cada card na tela representa uma coisa que o professor precisa decidir ou revisar — nunca uma lista de informação passiva misturada com ação.
2. **Sombra quase nenhuma.** `box-shadow: 0 1px 2px rgba(28,29,33,0.04)`. O card se separa do fundo pela borda de 1px (`--color-linha`) mais do que por sombra. Visual chapado, não "flutuante".
3. **Cantos arredondados, mas discretos.** `border-radius: 10px` em cards e inputs, `8px` em botões. Nada de pill-shape em botão de texto — isso é para badge/tag.
4. **Espaço em branco é conteúdo.** A mesma regra da barreira SEN-01 (poluição visual desorganiza a criança) vale para o professor. Prefira respiro a densidade.
5. **Sem gradiente, sem glassmorphism, sem ícone decorativo.** Se um ícone não ajuda a identificar a ação, ele não entra.

---

## 4. Botões

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| **Primário** | `#3A3ED1` | `#FFFFFF` | — | Uma só por tela. "Adaptar questão", "Gerar PEI", "Baixar PDF". |
| **Secundário** | transparente | `#3A3ED1` | `1px solid #3A3ED1` | Ação alternativa. "Cancelar", "Ver detalhes". |
| **Terciário / texto** | transparente | `#6B6D76` | — | Ação de baixo peso. "Pular por agora". |
| **Destrutivo** | transparente | `#B3261E` | `1px solid #B3261E` | "Excluir aluno". Nunca preenchido — exige confirmação em modal antes de qualquer ação irreversível. |

**Especificação:**
- Altura: `40px` padrão, `48px` em ações de tela cheia (mobile, "Baixar PDF")
- Padding horizontal: `16px`
- `border-radius: 8px`
- Peso da fonte: 500
- Hover: escurece 12% (índigo → `#2C2FA8`); nunca muda o tamanho ou adiciona sombra
- Estado de loading: substitui o texto por um spinner de 16px, mesma cor do texto — nunca desabilita sem indicar que algo está acontecendo (o professor está esperando o PARSER/ADAPTER responder)

---

## 5. Cards

```
┌─────────────────────────────────────┐
│  Rótulo do card         [badge]      │  ← H2, 18px, 600
│  Metadado secundário                 │  ← 13px, --texto-secundario
│                                       │
│  Conteúdo principal do card...       │  ← corpo, 15px
│                                       │
│  ─────────────────────────────────   │  ← divisor sutil se houver ação
│  [Ação secundária]      [Ação prim.] │
└─────────────────────────────────────┘
```

- Fundo `#FFFFFF`, borda `1px solid #E4E4E7`, `border-radius: 10px`
- Padding interno: `20px`
- Badge de status (ex.: "Rascunho pedagógico" / "Validado") usa a cor **Tarja** (`#FFC94A`) com texto escuro — nunca vermelho/verde nesse badge específico, porque não é erro nem sucesso, é um **estado neutro de progresso**
- Card de alerta do VERIFIER: borda esquerda de 3px na cor terracota (`#C4633B`), o resto do card permanece neutro — o alerta chama atenção sem gritar

---

## 6. Formulários

O formulário mais importante do app é o de **barreiras do aluno** — ele precisa ser o mais claro de todos.

| Elemento | Especificação |
|---|---|
| **Label** | 13px, peso 500, `--color-tinta`, sempre acima do campo (nunca placeholder fazendo vez de label) |
| **Input** | Altura `44px`, borda `1px solid #E4E4E7`, `border-radius: 8px`, fundo `#FFFFFF` |
| **Input em foco** | Borda `#3A3ED1` + anel de foco `2px` em `rgba(58,62,209,0.15)` — visível para navegação por teclado, sem exceção |
| **Erro de campo** | Borda `#B3261E`, mensagem abaixo do campo em 13px na mesma cor, com ícone — nunca só a borda vermelha sozinha |
| **Checkbox de barreira** | Agrupado por família (ATN, EXE, LIN...) dentro de um card por grupo — nunca uma lista solta de 22 itens. Cada item mostra a `pergunta_gatilho`, não o código técnico. |
| **Toggle** (ex.: "1 questão por página") | Pill de 40×22px, `#3A3ED1` quando ativo, `#E4E4E7` quando inativo — nunca depende só da cor: o texto ao lado sempre nomeia o estado |

**Regra herdada do próprio produto:** todo campo obrigatório mostra `*` **e** a palavra "obrigatório" no texto de apoio — cor sozinha (asterisco vermelho) não basta, mesma lógica do WCAG 1.4.1 que rege as provas.

---

## 7. Tokens — resumo para copiar no código

```css
:root {
  /* cor */
  --color-tinta: #1C1D21;
  --color-papel: #FAFAF9;
  --color-superficie: #FFFFFF;
  --color-indigo: #3A3ED1;
  --color-indigo-escuro: #2C2FA8;
  --color-salvia: #4C8B6E;
  --color-terracota: #C4633B;
  --color-erro: #B3261E;
  --color-tarja: #FFC94A;
  --color-linha: #E4E4E7;
  --color-texto-secundario: #6B6D76;

  /* tipografia */
  --font-display: 'Fraunces', serif;
  --font-corpo: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* forma */
  --radius-card: 10px;
  --radius-botao: 8px;
  --shadow-card: 0 1px 2px rgba(28, 29, 33, 0.04);
}
```

---

## 8. O que este documento não cobre (de propósito)

Não define o layout de cada tela — isso é wireframe, vem depois, tela por tela, quando a F1 chegar em cada uma. Este documento define **o vocabulário**, para que qualquer tela nova (sua ou do Claude Code) já nasça consistente com as outras, sem precisar redecidir cor e espaçamento a cada componente.
