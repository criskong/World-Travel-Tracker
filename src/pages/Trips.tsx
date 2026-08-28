import { Plane } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Trips() {
  return (
    <PagePlaceholder
      icon={Plane}
      title="Viaggi"
      description="Timeline dei viaggi con date, città, note e foto salvate localmente."
      phase="In arrivo nella fase 4"
    />
  )
}
