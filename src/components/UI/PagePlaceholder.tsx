import type { LucideIcon } from 'lucide-react'

interface PagePlaceholderProps {
  title: string
  description: string
  phase: string
  icon: LucideIcon
}

/**
 * Segnaposto delle pagine non ancora implementate.
 * Dice esplicitamente in quale fase arriveranno: meglio di una pagina vuota
 * che sembra un bug.
 */
export function PagePlaceholder({ title, description, phase, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-surface">
        <Icon size={24} strokeWidth={1.6} className="text-slate-500" aria-hidden />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      <p className="mt-6 rounded-full border border-edge px-3 py-1 text-xs text-slate-600">
        {phase}
      </p>
    </div>
  )
}
