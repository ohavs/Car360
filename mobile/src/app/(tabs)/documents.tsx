import { FilePlus2, FileText } from 'lucide-react-native'
import { carDisplayName } from '@shared/reminders'
import { useGarage } from '../../data/CarsProvider'
import { useCarDocuments } from '../../features/documents/useCarDocuments'
import { radius } from '../../theme/tokens'
import { AppBar, EmptyState, FAB, FilterChips, Screen, Skeleton } from '../../ui'

/** The active car's documents, right away — with a car switch on top when
 *  there is more than one car (it also switches the car on the home screen). */
export default function DocumentsTab() {
  const { cars, loading, activeCar, setActiveCarId } = useGarage()
  const docs = useCarDocuments(activeCar?.id)

  return (
    <Screen
      header={<AppBar title="מסמכים ותמונות" subtitle={activeCar && cars.length === 1 ? carDisplayName(activeCar) : undefined} />}
      fab={activeCar ? <FAB icon={FilePlus2} label="מסמך חדש" onPress={docs.add} /> : undefined}
    >
      {loading ? (
        <Skeleton height={180} radius={radius.card} />
      ) : !activeCar ? (
        <EmptyState icon={FileText} title="אין רכבים עדיין" subtitle="הוסיפו רכב כדי לשמור מסמכים" />
      ) : (
        <>
          {cars.length > 1 && (
            <FilterChips
              value={activeCar.id}
              onChange={setActiveCarId}
              options={cars.map((c) => ({ value: c.id, label: carDisplayName(c) }))}
            />
          )}
          {docs.content}
        </>
      )}
    </Screen>
  )
}
