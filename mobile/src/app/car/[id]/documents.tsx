import { FilePlus2 } from 'lucide-react-native'
import { carDisplayName } from '@shared/reminders'
import { useCarParam } from '../../../features/cars/useCarParam'
import { useCarDocuments } from '../../../features/documents/useCarDocuments'
import { AppBar, FAB, Screen } from '../../../ui'

export default function CarDocumentsScreen() {
  const { id, car } = useCarParam()
  const docs = useCarDocuments(id)
  return (
    <Screen
      header={<AppBar title="מסמכים ותמונות" subtitle={car ? carDisplayName(car) : undefined} back />}
      fab={<FAB icon={FilePlus2} label="מסמך חדש" onPress={docs.add} />}
    >
      {docs.content}
    </Screen>
  )
}
