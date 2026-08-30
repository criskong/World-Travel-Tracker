import { useCallback, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  HardDrive,
  ImageOff,
  Languages,
  Share,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react'
import { Modal } from '../components/UI/Modal'
import { useTravelStore } from '../store/travelStore'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { BACKUP_FILENAME, downloadBackup } from '../utils/backupFile'
import { parseTravelDataJson } from '../utils/travelDataSchema'
import { useTranslation } from '../i18n/useTranslation'
import { LANGUAGES, LANGUAGE_NAMES } from '../i18n/languages'
import type { LocalizedMessage } from '../i18n/message'
import type { Translation } from '../i18n/useTranslation'
import type { TravelData, TravelDataExport } from '../types'

/**
 * Gestione dell'app: lingua, installazione, export, import, reset.
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
  warnings: LocalizedMessage[]
}

type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'rejected'; errors: LocalizedMessage[] }
  | { status: 'done'; countries: number; trips: number; warnings: LocalizedMessage[] }

export default function Settings() {
  const { t } = useTranslation()

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
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('settings.subtitle')}</p>
      </header>

      <LanguageSection />

      <InstallSection />

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
  description: React.ReactNode
  children?: React.ReactNode
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
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
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
  tone: 'warning' | 'success' | 'error' | 'neutral'
  children: React.ReactNode
}) {
  const styles = {
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
    success: 'border-accent/30 bg-accent-dim text-accent',
    error: 'border-red-500/30 bg-red-500/5 text-red-200',
    neutral: 'border-edge bg-base-900/40 text-slate-400',
  }[tone]

  return (
    <div className={`mt-4 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${styles}`}>
      {children}
    </div>
  )
}

/** Elenco di messaggi già tradotti. */
function MessageList({
  messages,
  translation,
  className,
}: {
  messages: readonly LocalizedMessage[]
  translation: Translation
  className?: string
}) {
  if (messages.length === 0) return null
  return (
    <ul className={`mt-1.5 list-inside list-disc space-y-0.5 ${className ?? ''}`}>
      {messages.map((message) => (
        <li key={`${message.key}-${JSON.stringify(message.vars ?? {})}`}>
          {translation.t(message.key, message.vars)}
        </li>
      ))}
    </ul>
  )
}

function LanguageSection() {
  const { t, language } = useTranslation()
  const setLanguage = useTravelStore((state) => state.setLanguage)

  return (
    <SectionCard
      icon={<Languages size={17} strokeWidth={1.8} aria-hidden />}
      title={t('settings.language.title')}
      description={t('settings.language.description')}
    >
      <div role="radiogroup" aria-label={t('settings.language.title')} className="mt-4 flex gap-2">
        {LANGUAGES.map((option) => {
          const active = option === language
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void setLanguage(option)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-accent/40 bg-accent-dim text-accent'
                  : 'border-edge-strong bg-surface-raised text-slate-200 hover:border-accent/40 hover:text-accent'
              }`}
            >
              {active && <Check size={14} aria-hidden />}
              {LANGUAGE_NAMES[option]}
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}

/**
 * Installazione.
 *
 * Su Android il browser offre l'installazione da solo e qui c'è un bottone
 * vero. Su iPhone e iPad non esiste nessuna API equivalente: Safari la
 * consente solo dal menu Condividi, quindi l'unica cosa utile che si può fare
 * è scrivere i passaggi.
 */
function InstallSection() {
  const { t } = useTranslation()
  const { state, busy, install, iosNeedsSafari } = useInstallPrompt()

  return (
    <SectionCard
      icon={<Smartphone size={17} strokeWidth={1.8} aria-hidden />}
      title={t('settings.install.title')}
      description={t('settings.install.description')}
    >
      {state === 'installed' && (
        <Notice tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} aria-hidden />
            {t('settings.install.installed')}
          </span>
        </Notice>
      )}

      {state === 'available' && (
        <div className="mt-4">
          <ActionButton onClick={() => void install()} disabled={busy}>
            <Download size={15} aria-hidden />
            {t('settings.install.button')}
          </ActionButton>
        </div>
      )}

      {state === 'ios' && (
        <Notice tone="neutral">
          <p className="flex items-center gap-2 font-medium text-slate-300">
            <Share size={14} aria-hidden />
            {t('settings.install.iosTitle')}
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>{t('settings.install.ios1')}</li>
            <li>{t('settings.install.ios2')}</li>
            <li>{t('settings.install.ios3')}</li>
          </ol>
          {iosNeedsSafari && (
            <p className="mt-2 text-amber-200/90">{t('settings.install.iosNote')}</p>
          )}
        </Notice>
      )}

      {state === 'unavailable' && (
        <Notice tone="neutral">{t('settings.install.unavailable')}</Notice>
      )}
    </SectionCard>
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
  const { t } = useTranslation()
  const [saved, setSaved] = useState(false)

  const handleExport = useCallback(() => {
    downloadBackup(onExport())
    setSaved(true)
  }, [onExport])

  return (
    <SectionCard
      icon={<Download size={17} strokeWidth={1.8} aria-hidden />}
      title={t('settings.export.title')}
      description={t('settings.export.description', {
        countries: t('common.country#', { count: countries }),
        trips: t('common.trip#', { count: trips }),
      })}
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
            <strong className="font-semibold">{t('settings.export.noPhotos')}</strong>{' '}
            {t('settings.export.noPhotosBody')}
            {photos > 0 && <> {t('settings.export.photosStay#', { count: photos })}</>}
          </span>
        </span>
      </Notice>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ActionButton onClick={handleExport} disabled={isEmpty}>
          <Download size={15} aria-hidden />
          {t('settings.export.button')}
        </ActionButton>
        <span className="font-mono text-xs text-subtle">{BACKUP_FILENAME}</span>
      </div>

      {isEmpty && <p className="mt-3 text-xs text-subtle">{t('settings.export.nothing')}</p>}

      {saved && !isEmpty && (
        <Notice tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} aria-hidden />
            {t('settings.export.saved')}
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
  const translation = useTranslation()
  const { t } = translation
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
      setState({ status: 'rejected', errors: [{ key: 'validation.readFailed' }] })
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
      title={t('settings.import.title')}
      description={t('settings.import.description')}
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
            <strong className="font-semibold">{t('settings.import.replaces')}</strong>{' '}
            {t('settings.import.replacesBody', {
              countries: t('common.country#', { count: currentCountries }),
              trips: t('common.trip#', { count: currentTrips }),
            })}
          </span>
        </span>
      </Notice>

      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-edge-strong bg-surface-raised px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-accent">
          <Upload size={15} aria-hidden />
          {state.status === 'reading' ? t('settings.import.reading') : t('settings.import.choose')}
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
          <p className="font-semibold">{t('settings.import.rejected')}</p>
          <MessageList messages={state.errors} translation={translation} />
        </Notice>
      )}

      {state.status === 'done' && (
        <Notice tone="success">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={14} aria-hidden />
            {t('settings.import.done', {
              countries: t('common.country#', { count: state.countries }),
              trips: t('common.trip#', { count: state.trips }),
            })}
          </p>
          <MessageList
            messages={state.warnings}
            translation={translation}
            className="text-amber-200/90"
          />
        </Notice>
      )}

      {pending !== null && (
        <Modal title={t('settings.import.confirmTitle')} onClose={() => setPending(null)}>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            {t('settings.import.confirmTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t('settings.import.confirmBody', {
              file: pending.fileName,
              countries: t('common.country#', { count: pending.data.manuallyMarked.length }),
              trips: t('common.trip#', { count: pending.data.visits.length }),
            })}
          </p>

          {hasSomethingToLose ? (
            <p className="mt-3 text-sm leading-relaxed text-amber-200/90">
              {t('settings.import.confirmLoss', {
                countries: t('common.country#', { count: currentCountries }),
                trips: t('common.trip#', { count: currentTrips }),
              })}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">{t('settings.import.confirmNoLoss')}</p>
          )}

          <MessageList
            messages={pending.warnings}
            translation={translation}
            className="mt-3 text-xs text-amber-200/90"
          />

          <div className="mt-5 flex justify-end gap-2">
            <ActionButton onClick={() => setPending(null)}>{t('common.cancel')}</ActionButton>
            <ActionButton onClick={() => void confirmImport()} tone="danger">
              {t('settings.import.confirmButton')}
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
  const { t } = useTranslation()
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
      title={t('settings.reset.title')}
      description={t('settings.reset.description')}
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
          {t('settings.reset.button')}
        </ActionButton>
      </div>

      {isEmpty && !done && <p className="mt-3 text-xs text-subtle">{t('settings.reset.nothing')}</p>}

      {done && (
        <Notice tone="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} aria-hidden />
            {t('settings.reset.done')}
          </span>
        </Notice>
      )}

      {asking && (
        <Modal title={t('settings.reset.confirmTitle')} onClose={() => setAsking(false)}>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            {t('settings.reset.confirmTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t('settings.reset.confirmBody', {
              countries: t('common.country#', { count: countries }),
              trips: t('common.trip#', { count: trips }),
              photos:
                photos > 0
                  ? t('settings.reset.confirmPhotos', {
                      photos: t('common.photo#', { count: photos }),
                    })
                  : '',
            })}
          </p>
          <p className="mt-3 text-sm text-muted">{t('settings.reset.confirmHint')}</p>

          <div className="mt-5 flex justify-end gap-2">
            <ActionButton onClick={() => setAsking(false)}>{t('common.cancel')}</ActionButton>
            <ActionButton onClick={() => void confirm()} tone="danger">
              {t('settings.reset.confirmButton')}
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
  message: LocalizedMessage | null
}) {
  const { t } = useTranslation()

  return (
    <SectionCard
      icon={<HardDrive size={17} strokeWidth={1.8} aria-hidden />}
      title={t('settings.storage.title')}
      description={t('settings.storage.description')}
    >
      {storage === 'unavailable' ? (
        <Notice tone="error">
          {message ? t(message.key, message.vars) : t('settings.storage.unavailable')}
        </Notice>
      ) : (
        <p className="mt-3 text-xs text-subtle">{t('settings.storage.ok')}</p>
      )}
    </SectionCard>
  )
}
