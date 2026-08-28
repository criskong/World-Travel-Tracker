import { ChartColumn } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Statistics() {
  return (
    <PagePlaceholder
      icon={ChartColumn}
      title="Statistics"
      description="The full picture: coverage by continent, how it grew over time, and personal records."
      phase="Coming in phase 5"
    />
  )
}
