import { useCallback, useEffect, useRef } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { getCountry, isUnMember } from '../../data/countries/countries'
import { hasVisits, isVisited } from '../../store/selectors'
import { useTravelStore } from '../../store/travelStore'
import { flagEmoji } from '../../utils/flag'

interface CountryDetailsPanelProps {
  code: string
  onClose: () => void
}

/**
 * Pannello dei dettagli di un Paese, aperto dal click sul globo.
 *
 * Fase 3: contenuto minimo (bandiera, nome, continente, stato, bottone).
 * Il gesto però è già quello definitivo (CLAUDE.md, "Decisioni prese"):
 * il globo apre questo pannello e non modifica mai lo stato "visitato";
 * lo stato si cambia solo da qui.
 *
 * È piccolo e sta sopra il canvas WebGL: qui il blur è ammesso.
 */
export function CountryDetailsPanel({ code, onClose }: CountryDetailsPanelProps) {
  const country = getCountry(code)
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)
  const markVisited = useTravelStore((state) => state.markVisited)
  const unmarkVisited = useTravelStore((state) => state.unmarkVisited)

  const closeRef = useRef<HTMLButtonElement>(null)

  // Esc chiude il pannello: è l'unico modo di uscirne senza puntatore.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    closeRef.current?.focus()
  }, [code])

  const data = { manuallyMarked, visits }
  const visited = country ? isVisited(data, country.code) : false
  const countryHasVisits = country ? hasVisits(data, country.code) : false

  const handleToggle = useCallback(() => {
    if (!country) return
    if (visited) {
      void unmarkVisited(country.code)
    } else {
      void markVisited(country.code)
    }
  }, [country, markVisited, unmarkVisited, visited])

  if (!country) return null

  return (
    <div
      role="dialog"
      aria-label={`Dettagli di ${country.name}`}
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 animate-slide-in rounded-2xl border border-edge-strong bg-surface-strong p-4 shadow-card backdrop-blur-md sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-72"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-3xl leading-none">
          {flagEmoji(country.code)}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight text-slate-100">
            {country.name}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {country.continent}
            <span aria-hidden> · </span>
            <span className="font-mono tracking-wider">{country.code}</span>
            {!isUnMember(country.code) && (
              <>
                <span aria-hidden> · </span>
                <span title="Non è uno Stato membro ONU: non entra nel conteggio X/195">
                  territorio
                </span>
              </>
            )}
          </p>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Chiudi i dettagli"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface-raised hover:text-slate-300"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2 text-xs">
        <span
          className={
            visited
              ? 'inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-2.5 py-1 font-medium text-accent'
              : 'inline-flex items-center gap-1.5 rounded-full border border-edge px-2.5 py-1 text-slate-500'
          }
        >
          {visited && <Check size={12} aria-hidden />}
          {visited ? 'Visitato' : 'Non visitato'}
        </span>
      </div>

      {countryHasVisits ? (
        /*
         * Il Paese ha viaggi registrati. Toglierlo dai visitati significa
         * eliminarli: serve la modal di conferma che li elenca, prevista in
         * fase 4 insieme alla UI dei viaggi. Finché non c'è, il bottone
         * resta disattivato invece di fare silenziosamente la cosa sbagliata.
         */
        <p className="mt-3 rounded-xl border border-edge bg-surface px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          {visits.filter((visit) => visit.countryCode === country.code).length} viaggi registrati.
          La rimozione con conferma arriva insieme alla gestione dei viaggi.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={
            visited
              ? 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-edge px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-edge-strong hover:bg-surface-raised'
              : 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-base-900 transition-all hover:bg-accent-soft hover:shadow-glow'
          }
        >
          {visited ? <X size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
          {visited ? 'Rimuovi da visitati' : 'Segna come visitato'}
        </button>
      )}
    </div>
  )
}
