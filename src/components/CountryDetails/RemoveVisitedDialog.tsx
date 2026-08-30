import { TriangleAlert } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { useTranslation } from '../../i18n/useTranslation'
import type { Country, Visit } from '../../types'

interface RemoveVisitedDialogProps {
  country: Country
  /** I viaggi che verranno eliminati, già ordinati per data. */
  visits: readonly Visit[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Conferma della rimozione dello stato "visitato" per un Paese che ha viaggi
 * registrati (CLAUDE.md, "Decisioni prese").
 *
 * Deve dire quanti viaggi verranno eliminati ED elencarli: è l'unica azione
 * distruttiva dell'app e non esiste un annulla.
 */
export function RemoveVisitedDialog({
  country,
  visits,
  onConfirm,
  onCancel,
}: RemoveVisitedDialogProps) {
  const { t, country: countryLabel, date } = useTranslation()
  const count = visits.length
  const name = countryLabel(country.code)

  return (
    <Modal title={t('remove.title', { country: name })} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
          <TriangleAlert size={16} className="text-red-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            {t('remove.title', { country: name })}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {t('remove.body#', { count })}
          </p>
        </div>
      </div>

      <ul className="scroll-area mt-4 max-h-48 overflow-y-auto rounded-xl border border-edge">
        {visits.map((visit) => (
          <li
            key={visit.id}
            className="flex items-baseline justify-between gap-3 border-b border-edge px-3 py-2 text-sm last:border-b-0"
          >
            <span className="truncate text-slate-300">{visit.city || name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{date(visit.date)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-edge px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-edge-strong hover:bg-surface-raised"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400"
        >
          {t('remove.confirm#', { count })}
        </button>
      </div>
    </Modal>
  )
}
