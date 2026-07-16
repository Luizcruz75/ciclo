import Link from 'next/link'
import { BotaoSair } from '@/components/BotaoSair'

// Header persistente para toda tela logada. Middleware já garante que só
// usuário autenticado chega aqui — este layout não repete a checagem de
// sessão, só cuida do chrome visual comum (DESIGN.md §1: "cor carrega
// ênfase", nenhuma decisão de acesso mora aqui.
export default function LayoutProtegido({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-linha bg-superficie">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/painel"
            className="font-[family-name:var(--font-display)] text-lg font-semibold text-tinta"
          >
            Ciclo
          </Link>
          <BotaoSair />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
