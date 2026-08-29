import { useCallback, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  HardDrive,
  ImageOff,
  Trash2,
  Upload,
} from 'lucide-react'
import { Modal } from '../components/UI/Modal'
import { useTravelStore } from '../store/travelStore'
import { BACKUP_FILENAME, downloadBackup } from '../utils/backupFile'
import { parseTravelDataJson } from '../utils/travelDataSchema'
import type { TravelData, TravelDataExport } from '../types'

/**
 * Gestione dei dati: export, import, reset.
 *
 * Due regole valgono per tutta la pagina.
 * 1. Quello che un'azione farà si dice PRIMA di poterla lanciare, non dopo:
 *    che le foto non entrano nel backup, e che l'import sostituisce tutto.
 * 2. Niente viene scritto finché il file non ha superato la validazione.
 *    `parseTravelDataJson` è puro e non tocca il database: se fallisce, i
 *    dati esistenti non sono mai stati sfiorati.
 */

/** Il file scelto, già validato, in attesa della conferma dell'utente. */
interface PendingImport {
  fileName: string
  data: TravelData
  warnings: string[]
}

type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'rejected'; errors: string[] }
  | { status: 'done'; countries: number; trips: number; warnings: string[] }

export default function Settings() {
  const manuallyMarked = useTravelStore((state) => state.manuallyMarked)
  const visits = useTravelStore((state) => state.visits)
  const storage = useTravelStore((state) => state.storage)
  const storageMessage = useTravelStore((state) => state.storageMessage)
  const exportData = useTravelStore((state) => state.exportData)
  const importData = useTravelStore((state) => state.importData)
  const resetData = useTravelStore((state) => state.resetData)

  const photoCount = visits.filter((visit) => visit.photoId !== undefined).length
  const isEmpty = manuallyMarked.length === 0 && visits.length === 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-10 pt-5 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your data never leaves this device. Back it up yourself, or start over.
        </p>
      </header>

      <ExportSection
        countries={manuallyMarked.length}
        trips={visits.length}
        photos={photoCount}
        isEmpty={isEmpty}
        onExport={exportData}
      />

      <ImportSection
        currentCountries={manuallyMarked.length}
        currentTrips={visits.length}
        onImport={importData}
      />

      <ResetSection
        isEmpty={isEmpty}
        countries={manuallyMarked.length}
        trips={visits.length}
        photos={photoCount}
        onReset={resetData}
      />

      <StorageSection storage={storage} message={storageMessage} />
    </div>
  )
}

function SectionCard({
  icon,
  title,
  description,
  children,
  tone = 'default',
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section
      aria-label={title}
      className={`card animate-fade-up p-5 ${tone === 'danger' ? 'border-red-500/25' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={tone === 'danger' ? 'text-red-400' : 'text-accent'}>{icon}</span>
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      {children}
    </section>
  )
}

/** Bottone primario della pagina. Un solo posto per lo stile. */
function ActionButton({
  onClick,
  children,
  disabled = false,
  tone = 'default',
  type = 'button',
}: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  tone?: 'default' | 'danger'
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:enabled:bg-red-500/20'
          : 'border-edge-strong bg-surface-raised text-slate-200 hover:enabled:border-accent/40 hover:enabled:text-accent'
      }`}
    >
      {children}
    </button>
  )
}

function Notice({
  tone,
  children,
}: {
  tone: 'warning' | 'success' | 'error'
  children: React.ReactNode
}) {
  const styles = {
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
    success: 'border-accent/30 bg-accent-dim text-accent',
    error: 'border-red-500/30 bg-red-500/5 text-red-200',
  }[tone]

  return (
    <div className={`mt-4 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${styles}`}>
      {children}
    </div>
  )
}

function ExportSection({
  countries,
  trips,
  photos,
  isEmpty,
  onExport,
}: {
  countries: number
  trips: number
  photos: number
  isEmpty: boolean
  onExport: () => TravelDataExport
}) {
  const [saved, setSaved] = useState(false)

  const handleExport = useCallback(() => {
    downloadBackup(onExport())
    setSaved(true)
  }, [onExport])

  return (
    <SectionCard
      icon={<Download size={17} strokeWidth={1.8} aria-hidden />}
      title="Export a backup"
      description={`Saves ${countries} manually marked ${
        countries === 1 ? 'country' : 'countries'
      } and ${trips} ${trips === 1 ? 'trip' : 'trips'} to a JSON file you keep yourself.`}
    >
      {/*
        L'avviso sulle foto sta PRIMA del bottone, per richiesta esplicita:
        scoprire dopo il download che il backup non è completo sarebbe il modo
        peggiore di scoprirlo.
      */}
      <Notice tone="warning">
        <span className="flex gap-2">
          <ImageOff size={14} className="mt-px shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Photos are not included.</strong> The file holds
            countries, dates, cities and notes only.
            {photos > 0 && (
              <>
                {' '}
                The {photos} {photos === 1 ? 'photo' : 'photos'} you attached{' '}
                {photos === 1 ? 'stays' : 'stay'} on this device and{' '}
                will be lost if you clear your browser data.
              </>
            )}
          </span>
        </span>
      </Notice>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ActionButton onClick={handleExport} disabled={isEmpty}>
          <Download size={15} aria-hidden />
          Export backup
        </ActionButton>
        <span className="font-mono text-xs text-slate-600">{BACKUP_FILENAME}</span>
      </div>

      {isEmpty && (
        <p className="mt-3 text-xs text-slate-600">
          Nothing to export yet — mark a country or add a trip first.
        </p>
      )}

      {saved && !isEmpty && (
        <Notice tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} aria-hidden />
            Backup saved. Check your downloads folder.
          </span>
        </Notice>
      )}
    </SectionCard>
  )
}

function ImportSection({
  currentCountries,
  currentTrips,
  onImport,
}: {
  currentCountries: number
  currentTrips: number
  onImport: ReturnType<typeof useTravelStore.getState>['importData']
}) {
  const [state, setState] = useState<ImportState>({ status: 'idle' })
  const [pending, setPending] = useState<PendingImport | null>(null)

  const handleFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Azzerare il valore permette di riscegliere lo stesso file dopo un errore.
    event.target.value = ''
    if (!file) return

    setPending(null)
    setState({ status: 'reading' })

    let text: string
    try {
      text = await file.text()
    } catch {
      setState({ status: 'rejected', errors: ['Could not read that file. Try picking it again.'] })
      return
    }

    // Validazione completa PRIMA di qualunque scrittura: se fallisce qui, il
    // database non è stato nemmeno aperto.
    const parsed = parseTravelDataJson(text)
    if (!parsed.ok) {
      setState({ status: 'rejected', errors: parsed.errors })
      return
    }

    setState({ status: 'idle' })
    setPending({ fileName: file.name, data: parsed.data, warnings: parsed.warnings })
  }, [])

  const confirmImport = useCallback(async () => {
    if (!pending) return
    const { data, warnings } = pending
    setPending(null)

    const outcome = await onImport(data)
    if (!outcome.ok) {
      setState({ status: 'rejected', errors: outcome.errors })
      return
    }
    setState({
      status: 'done',
      countries: data.manuallyMarked.length,
      trips: data.visits.length,
      warnings,
    })
  }, [onImport, pending])

  const hasSomethingToLose = currentCountries > 0 || currentTrips > 0

  return (
    <SectionCard
      icon={<Upload size={17} strokeWidth={1.8} aria-hidden />}
      title="Import a backup"
      description="Restores a JSON file exported from this app."
    >
      {/*
        DECISIONE: l'import SOSTITUISCE, non fonde. Un backup è una fotografia
        di uno stato, e ripristinarlo deve restituire esattamente quello stato;
        una fusione lascerebbe in giro voci che l'utente aveva cancellato, e
        non ci sarebbe modo di tornare indietro. Va detto prima, e infatti è
        qui sopra al selettore del file e ripetuto nella conferma.
      */}
      <Notice tone="warning">
        <span className="flex gap-2">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Importing replaces everything.</strong> Your current{' '}
            {currentCountries} marked {currentCountries === 1 ? 'country' : 'countries'} and{' '}
            {currentTrips} {currentTrips === 1 ? 'trip' : 'trips'} will be discarded, not merged.
            Export a backup first if you want to keep them.
          </span>
        </span>
      </Notice>

      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-edge-strong bg-surface-raised px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent">
          <Upload size={15} aria-hidden />
          {state.status === 'reading' ? 'Reading…' : 'Choose a backup file'}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleFile}
          />
        </label>
      </div>

      {state.status === 'rejected' && (
        <Notice tone="error">
          <p className="font-semibold">This file was not imported. Your data is unchanged.</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Notice>
      )}

      {state.status === 'done' && (
        <Notice tone="success">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={14} aria-hidden />
            Imported {state.countries} {state.countries === 1 ? 'country' : 'countries'} and{' '}
            {state.trips} {state.trips === 1 ? 'trip' : 'trips'}.
          </p>
          {state.warnings.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-amber-200/90">
              {state.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      {pending !== null && (
        <Modal title="Replace all your data?" onClose={() => setPending(null)}>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Replace all your data?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            <span className="font-mono text-xs text-slate-500">{pending.fileName}</span> contains{' '}
            <strong className="font-semibold text-slate-200">
              {pending.data.manuallyMarked.length}{' '}
              {pending.data.manuallyMarked.length === 1 ? 'country' : 'countries'}
            </strong>{' '}
            and{' '}
            <strong className="font-semibold text-slate-200">
              {pending.data.visits.length} {pending.data.visits.length === 1 ? 'trip' : 'trips'}
            </strong>
            .
          </p>

          {hasSomethingToLose ? (
            <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
              This replaces your current {currentCountries} marked{' '}
              {currentCountries === 1 ? 'country' : 'countries'} and {currentTrips}{' '}
              {currentTrips === 1 ? 'trip' : 'trips'}. They cannot be recovered afterwards.
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              You have nothing saved right now, so nothing will be lost.
            </p>
          )}

          {pending.warnings.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-0.5 text-xs text-amber-200/90">
              {pending.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <ActionButton onClick={() => setPending(null)}>Cancel</ActionButton>
            <ActionButton onClick={() => void confirmImport()} tone="danger">
              Replace my data
            </ActionButton>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

function ResetSection({
  isEmpty,
  countries,
  trips,
  photos,
  onReset,
}: {
  isEmpty: boolean
  countries: number
  trips: number
  photos: number
  onReset: () => Promise<void>
}) {
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(false)

  const confirm = useCallback(async () => {
    setAsking(false)
    await onReset()
    setDone(true)
  }, [onReset])

  return (
    <SectionCard
      icon={<Trash2 size={17} strokeWidth={1.8} aria-hidden />}
      title="Reset everything"
      description="Erases every marked country, every trip and every photo from this device. There is no undo."
      tone="danger"
    >
      <div className="mt-4">
        <ActionButton
          onClick={() => {
            setDone(false)
            setAsking(true)
          }}
          disabled={isEmpty}
          tone="danger"
        >
          <Trash2 size={15} aria-hidden />
          Reset all data
        </ActionButton>
      </div>

      {isEmpty && !done && (
        <p className="mt-3 text-xs text-slate-600">Nothing stored — there is nothing to reset.</p>
      )}

      {done && (
        <Notice tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} aria-hidden />
            Everything was erased. You are back to zero countries.
          </span>
        </Notice>
      )}

      {asking && (
        <Modal title="Erase everything?" onClose={() => setAsking(false)}>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Erase everything?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This deletes {countries} marked {countries === 1 ? 'country' : 'countries'}, {trips}{' '}
            {trips === 1 ? 'trip' : 'trips'}
            {photos > 0 && (
              <>
                {' '}
                and {photos} {photos === 1 ? 'photo' : 'photos'}
              </>
            )}
            . It cannot be undone.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            If you might want this back, cancel and export a backup first.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <ActionButton onClick={() => setAsking(false)}>Cancel</ActionButton>
            <ActionButton onClick={() => void confirm()} tone="danger">
              Erase everything
            </ActionButton>
          </div>
        </Modal>
      )}
    </SectionCard>
  )
}

function StorageSection({
  storage,
  message,
}: {
  storage: 'unknown' | 'available' | 'unavailable'
  message: string | null
}) {
  return (
    <SectionCard
      icon={<HardDrive size={17} strokeWidth={1.8} aria-hidden />}
      title="Where your data lives"
      description="Everything is stored in this browser, on this device. No account, no server, no sync — which also means nobody else can restore it for you."
    >
      {storage === 'unavailable' ? (
        <Notice tone="error">{message ?? 'Local storage is unavailable in this browser.'}</Notice>
      ) : (
        <p className="mt-3 text-xs text-slate-600">
          Local storage is working. Clearing your browser data, or uninstalling the app, deletes
          everything — a backup file is the only copy that survives.
        </p>
      )}
    </SectionCard>
  )
}
