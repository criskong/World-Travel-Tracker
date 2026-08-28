import { MapPinned } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Countries() {
  return (
    <PagePlaceholder
      icon={MapPinned}
      title="Paesi"
      description="L'elenco completo dei 195 Stati e dei territori, con ricerca, filtro per continente e stato di visita."
      phase="In arrivo nella fase 4"
    />
  )
}
