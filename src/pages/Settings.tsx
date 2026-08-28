import { Settings as SettingsIcon } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Settings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="Settings"
      description="Export and import your data, reset everything, and check how local storage is doing."
      phase="Coming in phase 6"
    />
  )
}
