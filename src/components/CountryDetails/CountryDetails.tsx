import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { getCountry, isUnMember } from '../../data/countries/countries'
import { hasVisits, isVisited, visitsForCountry } from '../../store/selectors'
import { useTravelStore } from '../../store/travelStore'
import { flagEmoji } from '../../utils/flag'
import { AddVisitForm } from './AddVisitForm'
import { RemoveVisitedDialog } from './RemoveVisitedDialog'
import { VisitCard } from './VisitCard'

interface CountryDetailsProps {
  code: string
  onClose: () => void
}

/**
 * Contenuto dei dettagli di un Paese. Non decide dove stare: su Home lo
 * ospita il pannello sopra il globo, su Countries e Trips il drawer laterale.
 *
 * Il gesto di rimozione segue CLAUDE.md, "Decisioni prese": qui e solo qui si
 * toglie lo stato "visitato", e se ci sono viaggi registrati passa dalla
 * modal di conferma che li elenca.
 */
export function CountryDetails({ code, onClose }: CountryDetailsProps) {
  const country = getCountry(code)

  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)
  const markVisited = useTravelStore((state) => state.markVisited)
  const unmarkVisited = useTravelStore((state) => state.unmarkVisited)
  const forgetCountry = useTravelStore((state) => state.forgetCountry)
  const removeVisit = useTravelStore((state) => state.removeVisit)

  const [addingVisit, setAddingVisit] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Cambiando Paese si riparte puliti: il form aperto su un altro Paese
  // resterebbe con i dati sbagliati.
  useEffect(() => {
    setAddingVisit(false)
    setConfirmingRemoval(false)
    closeRef.current?.focus()
  }, [code])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // La modal di conferma gestisce Esc per conto suo.
      if (event.key === 'Escape' && !confirmingRemoval) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmingRemoval, onClose])

  const data = useMemo(() => ({ manuallyMarked, visits }), [manuallyMarked, visits])
  const countryVisits = useMemo(
    () => (country ? visitsForCountry(data, country.code) : []),
    [country, data],
  )

  const visited = country ? isVisited(data, country.code) : false
  const countryHasVisits = country ? hasVisits(data, country.code) : false

  const handleVisitedToggle = useCallback(() => {
    if (!country) return
    if (!visited) {
      void markVisited(country.code)
      return
    }
    // Con viaggi registrati la rimozione è distruttiva: serve la conferma.
    if (countryHasVisits) {
      setConfirmingRemoval(true)
      return
    }
    void unmarkVisited(country.code)
  }, [country, countryHasVisits, markVisited, unmarkVisited, visited])

  const confirmRemoval = useCallback(() => {
    if (!country) return
    void forgetCountry(country.code)
    setConfirmingRemoval(false)
  }, [country, forgetCountry])

  if (!country) return null

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3 px-4 pt-4">
          <span aria-hidden className="text-3xl leading-none">
            {flagEmoji(country.code)}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-slate-100">
              {country.name}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
              <span>{country.continent}</span>
              <span aria-hidden>·</span>
              <span className="font-mono tracking-wider">{country.code}</span>
              {!isUnMember(country.code) && (
                <span
                  title="Not a UN member state — not counted in the 195"
                  className="rounded-full border border-edge px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500"
                >
                  Territory
                </span>
              )}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface-raised hover:text-slate-300"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto px-4 pb-4 pt-3.5">
          <div className="flex items-center gap-2">
            <span
              className={
                visited
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-2.5 py-1 text-xs font-medium text-accent'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-xs text-slate-500'
              }
            >
              {visited && <Check size={12} aria-hidden />}
              {visited ? 'Visited' : 'Not visited'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleVisitedToggle}
            className={
              visited
                ? 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-edge px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-edge-strong hover:bg-surface-raised'
                : 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-base-900 transition-all hover:bg-accent-soft hover:shadow-glow'
            }
          >
            {visited ? <X size={15} aria-hidden /> : <Check size={15} aria-hidden />}
            {visited ? 'Mark as not visited' : 'Mark as visited'}
          </button>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Trips {countryVisits.length > 0 && `(${countryVisits.length})`}
            </h3>
            {!addingVisit && (
              <button
                type="button"
                onClick={() => setAddingVisit(true)}
                className="flex items-center gap-1 text-xs font-medium text-accent transition-opacity hover:opacity-80"
              >
                <Plus size={13} aria-hidden />
                Add visit
              </button>
            )}
          </div>

          {addingVisit && (
            <div className="mt-3">
              <AddVisitForm
                countryCode={country.code}
                onDone={() => setAddingVisit(false)}
                onCancel={() => setAddingVisit(false)}
              />
            </div>
          )}

          {countryVisits.length === 0 ? (
            !addingVisit && (
              <p className="mt-3 rounded-xl border border-dashed border-edge px-3 py-4 text-center text-xs leading-relaxed text-slate-500">
                No trips recorded yet.
                <br />
                Add one to remember when you were here.
              </p>
            )
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {countryVisits.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onRemove={(id) => void removeVisit(id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {confirmingRemoval && (
        <RemoveVisitedDialog
          country={country}
          visits={countryVisits}
          onConfirm={confirmRemoval}
          onCancel={() => setConfirmingRemoval(false)}
        />
      )}
    </>
  )
}
