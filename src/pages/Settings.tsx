import { Settings as SettingsIcon } from 'lucide-react'
import { PagePlaceholder } from '../components/UI/PagePlaceholder'

export default function Settings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="Impostazioni"
      description="Esportazione e importazione dei dati, azzeramento e informazioni sull'archiviazione locale."
      phase="In arrivo nella fase 6"
    />
  )
}
