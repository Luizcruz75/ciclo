import Link from 'next/link'

// Usado nas telas "profundas" da hierarquia (ficha do aluno, editor de
// prova) — DESIGN.md não definia isso antes; item novo pedido para fechar
// a sensação de "beco sem saída" relatada no teste em produção.
export function Breadcrumb({ atual }: { atual: string }) {
  return (
    <nav className="text-[13px] text-texto-secundario mb-4">
      <Link href="/painel" className="hover:text-tinta transition-colors duration-150">
        Painel
      </Link>
      <span className="mx-1.5" aria-hidden>
        /
      </span>
      <span className="text-tinta">{atual}</span>
    </nav>
  )
}
