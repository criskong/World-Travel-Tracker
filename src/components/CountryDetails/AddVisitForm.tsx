import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { COUNTRIES } from '../../data/countries/countries'
import { useTravelStore } from '../../store/travelStore'
import { useObjectUrls } from '../../hooks/useObjectUrl'
import { usePhotos } from '../../hooks/usePhotos'
import { flagEmoji } from '../../utils/flag'
import { MAX_PHOTOS_PER_VISIT, validatePhoto } from '../../utils/photoValidation'
import { PhotoDecodeError, preparePhoto } from '../../utils/photoProcessing'
import { useTranslation } from '../../i18n/useTranslation'
import type { LocalizedMessage } from '../../i18n/message'
import type { Visit } from '../../types'

interface AddVisitFormProps {
  /** Paese preselezionato. Resta modificabile: il campo fa parte del form. */
  countryCode: string
  /**
   * Se c'e, il form MODIFICA questo viaggio invece di crearne uno: parte dai
   * suoi dati, mostra le sue foto (che si possono togliere) e salva con
   * `updateVisit`. Stesso form, stesse regole: un viaggio non ha due modi
   * diversi di essere valido a seconda di quando lo si tocca.
   */
  visit?: Visit
  onDone: () => void
  onCancel: () => void
}

/** Data di oggi in formato `YYYY-MM-DD`, ora locale. */
function today(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const FIELD_CLASS =
  'w-full rounded-xl border border-edge bg-base-900 px-3 py-2 text-sm text-slate-200 ' +
  'placeholder:text-subtle transition-colors focus:border-accent/50'

const LABEL_CLASS = 'text-xs font-medium text-muted'

/**
 * Form di aggiunta — e di modifica — di un viaggio.
 *
 * Solo la data è obbligatoria: un viaggio ricordato a metà è comunque un
 * viaggio, e costringere a inserire città e note farebbe perdere dati.
 * La foto viene validata PRIMA di arrivare a IndexedDB.
 */
export function AddVisitForm({ countryCode, visit, onDone, onCancel }: AddVisitFormProps) {
  const { t, country: countryLabel, compare } = useTranslation()
  const addVisit = useTravelStore((state) => state.addVisit)
  const updateVisit = useTravelStore((state) => state.updateVisit)

  const [code, setCode] = useState(visit?.countryCode ?? countryCode)
  const [date, setDate] = useState(visit?.date ?? today())
  const [city, setCity] = useState(visit?.city ?? '')
  const [note, setNote] = useState(visit?.note ?? '')
  const [photos, setPhotos] = useState<Blob[]>([])
  /** Quante foto stanno ancora passando per il canvas. */
  const [preparing, setPreparing] = useState(0)

  // In modifica: le foto gia salvate, con gli id che si e scelto di tenere.
  // Toglierne una qui non cancella niente finche non si salva.
  const existing = usePhotos(visit?.photoIds)
  const [keptIds, setKeptIds] = useState<string[]>(() => visit?.photoIds ?? [])
  const keptPhotos = existing.items.filter((item) => keptIds.includes(item.id))
  const photoCount = keptIds.length + photos.length
  const [photoError, setPhotoError] = useState<LocalizedMessage | null>(null)
  const [saving, setSaving] = useState(false)

  // Id unici: il form di aggiunta e quello di modifica di una card possono
  // essere aperti insieme, e due `htmlFor` uguali manderebbero il click al
  // campo sbagliato.
  const idBase = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Le anteprime revocano i propri object URL quando la lista cambia e allo
  // smontaggio: senza, ogni foto scelta resterebbe in memoria.
  const previewUrls = useObjectUrls(photos)

  // L'ordine alfabetico segue la lingua: in italiano "Germania" non sta dove
  // sta "Germany".
  const sortedCountries = useMemo(
    () =>
      [...COUNTRIES]
        .map((item) => ({ code: item.code, name: countryLabel(item.code) }))
        .sort((a, b) => compare(a.name, b.name)),
    [compare, countryLabel],
  )

  /**
   * Aggiunge i file scelti a quelli gia presenti, dopo averli ridotti.
   * Le foto valide entrano comunque: se una sola e troppo grande o illeggibile,
   * si segnala quella e si tengono le altre, invece di far ricominciare da capo.
   */
  const handleFiles = useCallback(
    async (chosen: FileList | null) => {
      // Copia PRIMA di azzerare il campo: `input.files` e una FileList viva,
      // e svuotare `value` la vuota — leggerla dopo significa non trovare
      // nessun file. Il campo si azzera perche scegliere di nuovo la stessa
      // foto deve rilanciare `change`.
      const files = chosen ? Array.from(chosen) : []
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (files.length === 0) return

      let error: LocalizedMessage | null = null
      const room = MAX_PHOTOS_PER_VISIT - keptIds.length - photos.length
      const candidates: File[] = []
      for (const file of files) {
        if (candidates.length >= room) {
          error = { key: 'photo.tooMany', vars: { max: MAX_PHOTOS_PER_VISIT } }
          break
        }
        const validation = validatePhoto(file)
        if (!validation.ok) {
          error = validation.error
          continue
        }
        candidates.push(file)
      }

      // Decodifica e riduzione: e qui che un HEIC su Chrome viene rifiutato,
      // dal browser e non da una lista nostra.
      setPreparing((count) => count + candidates.length)
      const prepared: Blob[] = []
      for (const file of candidates) {
        try {
          prepared.push(await preparePhoto(file))
        } catch (cause) {
          if (!(cause instanceof PhotoDecodeError)) throw cause
          error = { key: 'photo.unsupported', vars: { type: file.type || '?' } }
        } finally {
          setPreparing((count) => count - 1)
        }
      }

      setPhotos((current) => [...current, ...prepared])
      setPhotoError(error)
    },
    [keptIds.length, photos.length],
  )

  const removeKeptPhoto = useCallback((id: string) => {
    setKeptIds((current) => current.filter((keptId) => keptId !== id))
    setPhotoError(null)
  }, [])

  const removePhoto = useCallback((index: number) => {
    setPhotos((current) => current.filter((_, position) => position !== index))
    setPhotoError(null)
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (saving) return
      setSaving(true)

      const fields = {
        countryCode: code,
        date,
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }
      const newPhotos = photos.length > 0 ? photos : undefined

      const saved = visit
        ? await updateVisit(visit.id, { ...fields, photoIds: keptIds }, newPhotos)
        : await addVisit(fields, newPhotos)

      setSaving(false)
      if (saved) onDone()
    },
    [addVisit, city, code, date, keptIds, note, photos, saving, updateVisit, visit],
  )

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up rounded-xl border border-edge bg-surface p-3.5">
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={`${idBase}-country`} className={LABEL_CLASS}>
            {t('visit.country')}
          </label>
          <select
            id={`${idBase}-country`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          >
            {sortedCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {flagEmoji(country.code)} {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${idBase}-date`} className={LABEL_CLASS}>
            {t('visit.date')} <span className="text-accent">*</span>
          </label>
          <input
            id={`${idBase}-date`}
            type="date"
            required
            value={date}
            max={today()}
            onChange={(event) => setDate(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </div>

        <div>
          <label htmlFor={`${idBase}-city`} className={LABEL_CLASS}>
            {t('visit.city')} <span className="text-subtle">{t('common.optional')}</span>
          </label>
          <input
            id={`${idBase}-city`}
            type="text"
            value={city}
            maxLength={120}
            placeholder={t('visit.cityPlaceholder')}
            onChange={(event) => setCity(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </div>

        <div>
          <label htmlFor={`${idBase}-note`} className={LABEL_CLASS}>
            {t('visit.note')} <span className="text-subtle">{t('common.optional')}</span>
          </label>
          <textarea
            id={`${idBase}-note`}
            rows={2}
            value={note}
            maxLength={2000}
            placeholder={t('visit.notePlaceholder')}
            onChange={(event) => setNote(event.target.value)}
            className={`${FIELD_CLASS} mt-1 resize-none`}
          />
        </div>

        <div>
          <span className={LABEL_CLASS}>
            {t('visit.photo')}{' '}
            <span className="text-subtle">{t('visit.photoLimit', { max: MAX_PHOTOS_PER_VISIT })}</span>
          </span>

          {(keptPhotos.length > 0 || previewUrls.length > 0) && (
            <ul className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {keptPhotos.map((photo, index) => (
                <li key={photo.id} className="relative overflow-hidden rounded-lg border border-edge">
                  <img src={photo.url} alt="" className="h-20 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeKeptPhoto(photo.id)}
                    aria-label={t('visit.removePhotoAt', { position: index + 1 })}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-slate-300 transition-colors hover:text-white"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
              {previewUrls.map((url, index) => (
                <li key={url} className="relative overflow-hidden rounded-lg border border-edge">
                  <img src={url} alt="" className="h-20 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label={t('visit.removePhotoAt', { position: keptPhotos.length + index + 1 })}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-slate-300 transition-colors hover:text-white"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photoCount < MAX_PHOTOS_PER_VISIT && (
            <label
              htmlFor={`${idBase}-photo`}
              className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-edge-strong px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-slate-400"
            >
              <ImagePlus size={16} aria-hidden />
              {photoCount === 0 ? t('visit.choose') : t('visit.chooseMore')}
            </label>
          )}

          <input
            ref={fileInputRef}
            id={`${idBase}-photo`}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
          />

          {preparing > 0 && (
            <p className="mt-1.5 text-xs text-subtle" aria-live="polite">
              {t('photo.processing')}
            </p>
          )}

          {photoError !== null && (
            <p role="alert" className="mt-1.5 text-xs leading-relaxed text-red-300">
              {t(photoError.key, photoError.vars)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-edge px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-edge-strong hover:bg-surface-raised"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving || preparing > 0}
          className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base-900 transition-all hover:bg-accent-soft hover:shadow-glow disabled:opacity-60"
        >
          {saving ? t('visit.saving') : visit ? t('visit.update') : t('visit.save')}
        </button>
      </div>
    </form>
  )
}
