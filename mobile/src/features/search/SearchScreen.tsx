import { collection, getDocs, getFirestore } from '@react-native-firebase/firestore'
import { useRouter } from 'expo-router'
import { ArrowRight, Bell, CarFront, FileText, History, Search, SearchX, Shield, Wrench, X, type LucideIcon } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, CarDocument, CustomReminder, InsuranceRecord, ServiceRecord } from '@shared/types'
import { formatDate, formatPlate } from '@shared/utils'
import { readPref, writePref } from '../../lib/storage'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { useGarage } from '../../data/CarsProvider'
import { Card, CarThumb, Chip, EmptyState, IconButton, ListItem, Screen, SectionHeader, Skeleton, Text, TextField } from '../../ui'

interface Hit {
  key: string
  icon: LucideIcon
  /** the car this hit belongs to — shown as its picture and a bold name */
  car?: Car
  title: string
  subtitle: string
  href: string
}

interface Index {
  services: ServiceRecord[]
  insurances: InsuranceRecord[]
  documents: CarDocument[]
  reminders: CustomReminder[]
}

/** Hebrew-friendly matching: case, niqqud-free, and plates with or without dashes. */
const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[-\s.]/g, '')
const has = (q: string, ...fields: unknown[]) => fields.some((f) => norm(f).includes(q))

async function loadIndex(cars: Car[]): Promise<Index> {
  const db = getFirestore()
  const per = await Promise.all(
    cars.map(async (car) => {
      const [s, i, d, r] = await Promise.all(
        (['services', 'insurances', 'documents', 'reminders'] as const).map((sub) => getDocs(collection(db, 'cars', car.id, sub))),
      )
      return {
        services: s.docs.map((x) => x.data() as ServiceRecord),
        insurances: i.docs.map((x) => x.data() as InsuranceRecord),
        documents: d.docs.map((x) => x.data() as CarDocument),
        reminders: r.docs.map((x) => x.data() as CustomReminder),
      }
    }),
  )
  return {
    services: per.flatMap((p) => p.services),
    insurances: per.flatMap((p) => p.insurances),
    documents: per.flatMap((p) => p.documents),
    reminders: per.flatMap((p) => p.reminders),
  }
}

const GROUPS = ['רכבים', 'טיפולים', 'ביטוחים', 'מסמכים', 'תזכורות'] as const

/** One search over everything: cars, services, policies, documents, reminders.
 *  A full screen with the field in the top bar — the keyboard never covers it. */
export function SearchScreen() {
  const router = useRouter()
  const { cars } = useGarage()
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<Index | null>(null)
  const [recent, setRecent] = useState<string[]>(() => readPref<string[]>('recentSearches', []))

  useEffect(() => {
    loadIndex(cars).then(setIndex, () => setIndex({ services: [], insurances: [], documents: [], reminders: [] }))
  }, [cars])

  const q = norm(query)
  const groups = useMemo(() => {
    if (q.length < 2) return []
    const name = (id: string) => {
      const c = cars.find((x) => x.id === id)
      return c ? carDisplayName(c) : ''
    }
    const out: Record<(typeof GROUPS)[number], Hit[]> = { רכבים: [], טיפולים: [], ביטוחים: [], מסמכים: [], תזכורות: [] }
    for (const c of cars) {
      if (has(q, c.nickname, c.make, c.model, c.plate, c.vin, c.color, c.year))
        out['רכבים'].push({ key: c.id, icon: CarFront, car: c, title: carDisplayName(c), subtitle: formatPlate(c.plate), href: `/car/${c.id}` })
    }
    for (const s of index?.services ?? []) {
      if (has(q, s.title, s.garage, s.notes))
        out['טיפולים'].push({
          key: s.id,
          icon: Wrench,
          title: s.title || 'טיפול',
          subtitle: [formatDate(s.date), s.garage, name(s.carId)].filter(Boolean).join(' · '),
          href: `/car/${s.carId}/service-edit?rid=${s.id}`,
        })
    }
    for (const p of index?.insurances ?? []) {
      if (has(q, p.company, p.kind, p.policyNumber, p.agentName, p.notes))
        out['ביטוחים'].push({
          key: p.id,
          icon: Shield,
          title: [p.kind, p.company].filter(Boolean).join(' · '),
          subtitle: [p.endDate && `עד ${formatDate(p.endDate)}`, name(p.carId)].filter(Boolean).join(' · '),
          href: `/car/${p.carId}/insurance-edit?rid=${p.id}`,
        })
    }
    for (const d of index?.documents ?? []) {
      if (has(q, d.title, d.category))
        out['מסמכים'].push({ key: d.id, icon: FileText, title: d.title, subtitle: `${d.category} · ${name(d.carId)}`, href: `/car/${d.carId}/documents` })
    }
    for (const r of index?.reminders ?? []) {
      if (has(q, r.title))
        out['תזכורות'].push({
          key: r.id,
          icon: Bell,
          title: r.title,
          subtitle: [r.done ? 'בוצע' : formatDate(r.dueDate), name(r.carId)].join(' · '),
          href: '/reminders',
        })
    }
    return GROUPS.map((g) => ({ title: g, hits: out[g].slice(0, 8) })).filter((g) => g.hits.length)
  }, [q, cars, index])

  const open = (hit: Hit) => {
    const next = [query.trim(), ...recent.filter((r) => r !== query.trim())].slice(0, 6)
    setRecent(next)
    writePref('recentSearches', next)
    router.push(hit.href as never)
  }

  return (
    <Screen
      header={
        <View style={styles.bar}>
          <IconButton icon={ArrowRight} label="חזרה" onPress={() => router.back()} />
          <TextField
            label="חיפוש"
            placeholder="מוסך, פוליסה, לוחית, מסמך…"
            leadingIcon={Search}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            clearable
            style={styles.flex}
          />
        </View>
      }
    >
      {q.length < 2 ? (
        recent.length > 0 && (
          <View style={styles.recent}>
            <View style={styles.recentHead}>
              <History size={16} color={colors.muted} />
              <Text variant="label" tone="muted" style={styles.flex}>
                חיפושים אחרונים
              </Text>
              <IconButton
                icon={X}
                label="ניקוי"
                onPress={() => {
                  setRecent([])
                  writePref('recentSearches', [])
                }}
              />
            </View>
            <View style={styles.chips}>
              {recent.map((r) => (
                <Chip key={r} label={r} onPress={() => setQuery(r)} />
              ))}
            </View>
          </View>
        )
      ) : groups.length === 0 ? (
        index ? (
          <EmptyState icon={SearchX} title="לא נמצא דבר" subtitle={`אין תוצאות עבור "${query.trim()}"`} />
        ) : (
          <Card padded={false}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <Skeleton height={44} />
              </View>
            ))}
          </Card>
        )
      ) : (
        groups.map((g) => (
          <View key={g.title} style={styles.group}>
            <SectionHeader title={g.title} />
            <Card padded={false}>
              {g.hits.map((h) => (
                <ListItem
                  key={h.key}
                  icon={h.icon}
                  leading={h.car ? <CarThumb uri={h.car.imageUrl} kind={h.car.imageKind} /> : undefined}
                  title={h.title}
                  subtitle={h.subtitle}
                  onPress={() => open(h)}
                />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingStart: space.sm, paddingEnd: space.lg, paddingTop: space.md },
  group: { gap: space.sm },
  skeletonRow: { padding: space.lg },
  recent: { gap: space.sm },
  recentHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
})
