import { useRouter } from 'expo-router'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, CarFront, Plus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car } from '@shared/types'
import { formatDate, formatPlate, todayISO } from '@shared/utils'
import { useGarage } from '../data/CarsProvider'
import { deleteCar, patchCar } from '../data/mutations'
import { useAuth } from '../features/auth/AuthProvider'
import { AppBar, Button, Card, CarThumb, ConfirmDialog, EmptyState, IconButton, ListItem, Screen, SectionHeader, Text, useSnackbar } from '../ui'

/** The garage: order the cars, archive one that was sold (its history stays),
 *  bring it back, or delete it for good. */
export default function GarageScreen() {
  const { allCars } = useGarage()
  const { user } = useAuth()
  const router = useRouter()
  const snack = useSnackbar()
  const [archiving, setArchiving] = useState<Car | null>(null)
  const [deleting, setDeleting] = useState<Car | null>(null)
  const active = allCars.filter((c) => !c.archived)
  const archived = allCars.filter((c) => c.archived)

  const run = (work: Promise<void>, done: string) =>
    work.then(
      () => snack(done, { tone: 'success' }),
      () => snack('העדכון נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' }),
    )

  // swap with the neighbour: every car gets an explicit position
  const move = (index: number, by: -1 | 1) => {
    const next = [...active]
    const [car] = next.splice(index, 1)
    next.splice(index + by, 0, car)
    void Promise.all(next.map((c, i) => (c.order === i ? null : patchCar(c.id, { order: i })))).catch(() =>
      snack('השינוי נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' }),
    )
  }

  return (
    <Screen header={<AppBar title="הרכבים שלי" back />}>
      {active.length === 0 ? (
        <EmptyState icon={CarFront} title="אין רכבים פעילים" action={<Button label="הוספת רכב" icon={Plus} onPress={() => router.push('/car/new')} />} />
      ) : (
        <Card padded={false}>
          {active.map((car, i) => (
            <ListItem
              key={car.id}
              leading={<CarThumb uri={car.imageUrl} kind={car.imageKind} />}
              title={carDisplayName(car)}
              subtitle={[formatPlate(car.plate), car.ownerId !== user?.uid ? 'משותף איתך' : null].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/car/${car.id}`)}
              trailing={
                <View style={styles.actions}>
                  <IconButton icon={ArrowUp} label="למעלה" onPress={() => i > 0 && move(i, -1)} />
                  <IconButton icon={ArrowDown} label="למטה" onPress={() => i < active.length - 1 && move(i, 1)} />
                  {car.ownerId === user?.uid && <IconButton icon={Archive} label="לארכיון" onPress={() => setArchiving(car)} />}
                </View>
              }
            />
          ))}
        </Card>
      )}
      <Button label="רכב נוסף" icon={Plus} variant="outlined" onPress={() => router.push('/car/new')} />

      {archived.length > 0 && (
        <>
          <SectionHeader title="ארכיון — נמכרו או יצאו משימוש" />
          <Card padded={false}>
            {archived.map((car) => (
              <ListItem
                key={car.id}
                leading={<CarThumb uri={car.imageUrl} kind={car.imageKind} badge={Archive} />}
                title={carDisplayName(car)}
                subtitle={[formatPlate(car.plate), car.archivedAt ? `בארכיון מ-${formatDate(car.archivedAt)}` : null].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/car/${car.id}`)}
                trailing={
                  <View style={styles.actions}>
                    <IconButton
                      icon={ArchiveRestore}
                      label="החזרה לשימוש"
                      onPress={() => void run(patchCar(car.id, { archived: false, archivedAt: null } as never), `${carDisplayName(car)} חזר לחניה`)}
                    />
                    <IconButton icon={Trash2} label="מחיקה לצמיתות" onPress={() => setDeleting(car)} />
                  </View>
                }
              />
            ))}
          </Card>
          <Text variant="caption" tone="muted">
            רכב בארכיון לא מופיע בבית ולא שולח תזכורות, אבל כל ההיסטוריה שלו נשמרת — לדרכון, לדוחות ולמכירה.
          </Text>
        </>
      )}

      <ConfirmDialog
        visible={archiving !== null}
        title={`להעביר את ${archiving ? carDisplayName(archiving) : ''} לארכיון?`}
        message="מתאים לרכב שנמכר. התזכורות שלו ייעצרו, וההיסטוריה תישמר. אפשר להחזיר אותו בכל עת."
        confirmLabel="לארכיון"
        onCancel={() => setArchiving(null)}
        onConfirm={() => {
          const car = archiving
          setArchiving(null)
          if (car) void run(patchCar(car.id, { archived: true, archivedAt: todayISO() }), `${carDisplayName(car)} עבר לארכיון`)
        }}
      />
      <ConfirmDialog
        visible={deleting !== null}
        title={`למחוק את ${deleting ? carDisplayName(deleting) : ''} לצמיתות?`}
        message="הרכב יימחק יחד עם כל הטיפולים, הביטוחים, המסמכים וההוצאות שלו. אי אפשר לשחזר."
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const car = deleting
          setDeleting(null)
          if (car) void run(deleteCar(car), `${carDisplayName(car)} נמחק`)
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
})
