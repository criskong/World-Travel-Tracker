import { useCallback, useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { COUNTRIES } from '../../data/countries/countries'
import { useTravelStore } from '../../store/travelStore'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { flagEmoji } from '../../utils/flag'
import { MAX_PHOTO_BYTES, formatBytes, validatePhoto } from '../../utils/photoValidation'

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
  'placeholder:text-slate-600 transition-colors focus:border-accent/50'

const LABEL_CLASS = 'text-xs font-medium text-slate-500'

/**
 * Form di aggiunta viaggio.
 *
 * Solo la data è obbligatoria: un viaggio ricordato a metà è comunque un
 * viaggio, e costringere a inserire città e note farebbe perdere dati.
 * La foto viene validata PRIMA di arrivare a IndexedDB.
 */
export function AddVisitForm({ countryCode, onDone, onCancel }: AddVisitFormProps) {
  const addVisit = useTravelStore((state) => state.addVisit)

  const [code, setCode] = useState(countryCode)
  const [date, setDate] = useState(today())
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  // L'anteprima revoca il proprio object URL quando il file cambia e allo
  // smontaggio: senza, ogni foto scelta resterebbe in memoria.
  const previewUrl = useObjectUrl(photo)

  const sortedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [],
  )

  const handleFile = useCallback((file: File | null) => {
    if (!file) {
      setPhoto(null)
      setPhotoError(null)
      return
    }
    const validation = validatePhoto(file)
    if (!validation.ok) {
      setPhoto(null)
      setPhotoError(validation.error)
      return
    }
    setPhoto(file)
    setPhotoError(null)
  }, [])

  const clearPhoto = useCallback(() => {
    setPhoto(null)
    setPhotoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
        photo,
      )

      setSaving(false)
      if (created) onDone()
    },
    [addVisit, city, code, date, note, photo, saving],
  )

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up rounded-xl border border-edge bg-surface p-3.5">
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="visit-country" className={LABEL_CLASS}>
            Country
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
            Date <span className="text-accent">*</span>
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
            City <span className="text-slate-600">(optional)</span>
          </label>
          <input
            id="visit-city"
            type="text"
            value={city}
            maxLength={120}
            placeholder="Kyoto"
            onChange={(event) => setCity(event.target.value)}
            className={`${FIELD_CLASS} mt-1`}
          />
        </div>

        <div>
          <label htmlFor="visit-note" className={LABEL_CLASS}>
            Note <span className="text-slate-600">(optional)</span>
          </label>
          <textarea
            id="visit-note"
            rows={2}
            value={note}
            maxLength={2000}
            placeholder="What do you want to remember?"
            onChange={(event) => setNote(event.target.value)}
            className={`${FIELD_CLASS} mt-1 resize-none`}
          />
        </div>

        <div>
          <span className={LABEL_CLASS}>
            Photo <span className="text-slate-600">(optional, max {formatBytes(MAX_PHOTO_BYTES)})</span>
          </span>

          {previewUrl === null ? (
            <label
              htmlFor="visit-photo"
              className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-edge-strong px-3 py-2.5 text-sm text-slate-500 transition-colors hover:border-accent/40 hover:text-slate-400"
            >
              <ImagePlus size={16} aria-hidden />
              Choose a photo
            </label>
          ) : (
            <div className="relative mt-1 overflow-hidden rounded-xl border border-edge">
              <img src={previewUrl} alt="" className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-slate-300 transition-colors hover:text-white"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            id="visit-photo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />

          {photoError !== null && (
            <p role="alert" className="mt-1.5 text-xs leading-relaxed text-red-300">
              {photoError}
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base-900 transition-all hover:bg-accent-soft hover:shadow-glow disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save trip'}
        </button>
      </div>
    </form>
  )
}
