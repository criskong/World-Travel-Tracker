import { ChartColumn } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Statistics() {
  return (
    <PagePlaceholder
      icon={ChartColumn}
      title="Statistiche"
      description="Il quadro completo: copertura per continente, andamento nel tempo e primati personali."
      phase="In arrivo nella fase 5"
    />
  )
}
