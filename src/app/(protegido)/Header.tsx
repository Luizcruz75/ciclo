'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MenuProfessor } from './MenuProfessor'

export function Header({ nomeProfessor }: { nomeProfessor: string }) {
  const pathname = usePathname()
  const emPainel = pathname === '/painel'
  // "Nova prova" também cobre /provas/[id]/editor — não há item de nav
  // separado para o editor, e deixar nada destacado ali reproduzia
  // exatamente a sensação de "beco sem saída" relatada no teste.
  const emProvas = pathname.startsWith('/provas')

  return (
    <header className="border-b border-linha bg-superficie">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-2">
        <Link
          href="/painel"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-tinta hover:opacity-70 transition-opacity duration-150 mr-4"
        >
          Ciclo
        </Link>

        <nav className="flex items-center gap-1">
          <ItemNav href="/painel" ativo={emPainel}>
            Painel
          </ItemNav>
          <ItemNav href="/provas/nova" ativo={emProvas}>
            Nova prova
          </ItemNav>
        </nav>

        <div className="ml-auto">
          <MenuProfessor nome={nomeProfessor || 'Minha conta'} />
        </div>
      </div>
    </header>
  )
}

function ItemNav({
  href,
  ativo,
  children,
}: {
  href: string
  ativo: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`h-11 px-3 inline-flex items-center rounded-botao text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:border focus-visible:border-indigo focus-visible:ring-2 focus-visible:ring-indigo/15 ${
        ativo ? 'text-indigo bg-indigo/[0.08]' : 'text-tinta hover:bg-linha/50'
      }`}
    >
      {children}
    </Link>
  )
}
