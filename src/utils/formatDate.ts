/** Formatta una data `YYYY-MM-GG` in forma leggibile, senza dipendenze. */
export function formatVisitDate(date: string): string {
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(timestamp)) return date
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
}
