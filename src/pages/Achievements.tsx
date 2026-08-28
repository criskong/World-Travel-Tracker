import { Trophy } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Achievements() {
  return (
    <PagePlaceholder
      icon={Trophy}
      title="Achievement"
      description="Obiettivi che si sbloccano man mano che il mondo si colora."
      phase="In arrivo nella fase 5"
    />
  )
}
