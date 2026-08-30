import { TriangleAlert } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { formatVisitDate } from '../../utils/formatDate'
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
  const count = visits.length

  return (
    <Modal title={`Remove ${country.name} from visited`} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
          <TriangleAlert size={16} className="text-red-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Remove {country.name} from visited?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {count === 1
              ? 'This will also delete the 1 trip recorded for this country.'
              : `This will also delete the ${count} trips recorded for this country.`}{' '}
            This cannot be undone.
          </p>
        </div>
      </div>

      <ul className="scroll-area mt-4 max-h-48 overflow-y-auto rounded-xl border border-edge">
        {visits.map((visit) => (
          <li
            key={visit.id}
            className="flex items-baseline justify-between gap-3 border-b border-edge px-3 py-2 text-sm last:border-b-0"
          >
            <span className="truncate text-slate-300">{visit.city || country.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {formatVisitDate(visit.date)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-edge px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-edge-strong hover:bg-surface-raised"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400"
        >
          {count === 1 ? 'Remove and delete 1 trip' : `Remove and delete ${count} trips`}
        </button>
      </div>
    </Modal>
  )
}
