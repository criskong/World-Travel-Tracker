import { Trophy } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Achievements() {
  return (
    <PagePlaceholder
      icon={Trophy}
      title="Achievements"
      description="Milestones that unlock as more of the world lights up."
      phase="Coming in phase 5"
    />
  )
}
