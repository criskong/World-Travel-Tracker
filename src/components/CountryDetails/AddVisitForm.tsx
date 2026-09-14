import { useCallback, useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { COUNTRIES } from '../../data/countries/countries'
import { useTravelStore } from '../../store/travelStore'
import { useObjectUrls } from '../../hooks/useObjectUrl'
import { flagEmoji } from '../../utils/flag'
import {
  MAX_PHOTOS_PER_VISIT,
  MAX_PHOTO_BYTES,
  formatBytes,
  validatePhoto,
} from '../../utils/photoValidation'
import { useTranslation } from '../../i18n/useTranslation'
import type { LocalizedMessage } from '../../i18n/message'

interface AddVisitFormProps {
  /** Paese preselezionato. Resta modificabile: il campo fa parte del form. */
  countryCode: string
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
 * Form di aggiunta viaggio.
 *
 * Solo la data è obbligatoria: un viaggio ricordato a metà è comunque un
 * viaggio, e costringere a inserire città e note farebbe perdere dati.
 * La foto viene validata PRIMA di arrivare a IndexedDB.
 */
export function AddVisitForm({ countryCode, onDone, onCancel }: AddVisitFormProps) {
  const { t, country: countryLabel, compare } = useTranslation()
  const addVisit = useTravelStore((state) => state.addVisit)

  const [code, setCode] = useState(countryCode)
  const [date, setDate] = useState(today())
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState<LocalizedMessage | null>(null)
  const [saving, setSaving] = useState(false)

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
   * Aggiunge i file scelti a quelli gia presenti.
   * Le foto valide entrano comunque: se una sola e troppo grande, si segnala
   * quella e si tengono le altre, invece di far ricominciare da capo.
   */
  const handleFiles = useCallback((chosen: FileList | null) => {
    // Copia PRIMA di azzerare il campo: `input.files` e una FileList viva,
    // e svuotare `value` la vuota — leggerla dopo significa non trovare
    // nessun file. Il campo si azzera perche scegliere di nuovo la stessa
    // foto deve rilanciare `change`.
    const files = chosen ? Array.from(chosen) : []
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0) return

    setPhotos((current) => {
      let error: LocalizedMessage | null = null
      const accepted = [...current]

      for (const file of files) {
        if (accepted.length >= MAX_PHOTOS_PER_VISIT) {
          error = { key: 'photo.tooMany', vars: { max: MAX_PHOTOS_PER_VISIT } }
          break
        }
        const validation = validatePhoto(file)
        if (!validation.ok) {
          error = validation.error
          continue
        }
        accepted.push(file)
      }

      setPhotoError(error)
      return accepted
    })
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

      const created = await addVisit(
        {
          countryCode: code,
          date,
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
        photos.length > 0 ? photos : undefined,
      )

      setSaving(false)
      if (created) onDone()
    },
    [addVisit, city, code, date, note, photos, saving],
  )

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up rounded-xl border border-edge bg-surface p-3.5">
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="visit-country" className={LABEL_CLASS}>
            {t('visit.country')}
          </label>
          <select
            id="visit-country"
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
          <label htmlFor="visit-date" className={LABEL_CLASS}>
            {t('visit.date')} <span className="text-accent">*</span>
          </label>
          <input
            id="visit-date"
            type="date"
            required
            value={date}
            max={today()}
            onChange={(event) => setDate(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </div>

        <div>
          <label htmlFor="visit-city" className={LABEL_CLASS}>
            {t('visit.city')} <span className="text-subtle">{t('common.optional')}</span>
          </label>
          <input
            id="visit-city"
            type="text"
            value={city}
            maxLength={120}
            placeholder={t('visit.cityPlaceholder')}
            onChange={(event) => setCity(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </div>

        <div>
          <label htmlFor="visit-note" className={LABEL_CLASS}>
            {t('visit.note')} <span className="text-subtle">{t('common.optional')}</span>
          </label>
          <textarea
            id="visit-note"
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
            <span className="text-subtle">
              {t('visit.photoLimit', {
                max: MAX_PHOTOS_PER_VISIT,
                size: formatBytes(MAX_PHOTO_BYTES),
              })}
            </span>
          </span>

          {previewUrls.length > 0 && (
            <ul className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {previewUrls.map((url, index) => (
                <li key={url} className="relative overflow-hidden rounded-lg border border-edge">
                  <img src={url} alt="" className="h-20 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label={t('visit.removePhotoAt', { position: index + 1 })}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-slate-300 transition-colors hover:text-white"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {photos.length < MAX_PHOTOS_PER_VISIT && (
            <label
              htmlFor="visit-photo"
              className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-edge-strong px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-slate-400"
            >
              <ImagePlus size={16} aria-hidden />
              {photos.length === 0 ? t('visit.choose') : t('visit.chooseMore')}
            </label>
          )}

          <input
            ref={fileInputRef}
            id="visit-photo"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />

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
          disabled={saving}
          className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base-900 transition-all hover:bg-accent-soft hover:shadow-glow disabled:opacity-60"
        >
          {saving ? t('visit.saving') : t('visit.save')}
        </button>
      </div>
    </form>
  )
}
