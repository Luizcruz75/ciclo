# Protocolo de Adaptação — Ciclo

> **Status: rascunho. F0 em andamento.**
> Documento público. É o que substitui a chancela institucional do concorrente:
> eles têm 20 universidades; nós temos auditabilidade total.

---

## Regra permanente

Toda regra deste protocolo carrega um `fonte_id`.
Cada fonte vive em `/docs/embasamento/` com título, autor, URL, data de acesso e citação ABNT.

**Regra sem fonte não entra no produto.**

---

## Regras absolutas

| # | Regra | fonte_id | Status |
|---|---|---|---|
| R1 | A habilidade BNCC nunca muda | `?` | ⬜ falta fonte |
| R2 | O nível de dificuldade nunca é reduzido | `?` | ⬜ falta fonte |
| R3 | Texto longo é proibido | `?` | ⬜ falta fonte |
| R4 | Pergunta direta, sem rodeios | `?` | ⬜ falta fonte |
| R5 | Sem dupla negativa, sem ambiguidade | `?` | ⬜ falta fonte |
| R6 | Instruções passo a passo | `?` | ⬜ falta fonte |
| R7 | Melhor nenhuma imagem do que uma que confunde | `?` | ⬜ falta fonte |
| R8 | Pictograma só quando carrega significado | R7 | ⬜ falta fonte |

## Campo semântico

> A dificuldade deve estar **apenas na habilidade avaliada**, nunca no vocabulário do enunciado.

⬜ falta fonte

## Regra de cor

> A cor pode **carregar ênfase**. A cor **nunca carrega informação única**.

`fonte_id:` **WCAG 2.1 — critério 1.4.1 (Use of Color)** ✅
⬜ falta salvar o documento em `/docs/embasamento/`

---

## Taxonomia de barreiras

22 barreiras. Ver `data/barreiras.json`.

**Status:** conteúdo fechado com a pedagoga (2 rodadas de crítica).
🔴 **Pendente:** `fonte_id` de cada uma — parecer técnico assinado e datado.

---

## Guardrails determinísticos

Ver `CLAUDE.md`. G1 a G6 — derivados diretamente da taxonomia.
