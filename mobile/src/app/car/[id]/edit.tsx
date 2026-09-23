import { CarFront } from 'lucide-react-native'
import { CarForm } from '../../../features/cars/CarForm'
import { useCarParam } from '../../../features/cars/useCarParam'
import { AppBar, EmptyState, Screen } from '../../../ui'

export default function EditCarScreen() {
  const { car, loading } = useCarParam()
  if (!car) {
    return (
      <Screen header={<AppBar title="עריכת רכב" back />}>
        {!loading && <EmptyState icon={CarFront} title="הרכב לא נמצא" subtitle="ייתכן שהוא נמחק או שהשיתוף בוטל" />}
      </Screen>
    )
  }
  return <CarForm key={car.id} initial={car} />
}
