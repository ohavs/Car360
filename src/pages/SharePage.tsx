import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { IconChevronLeft, IconFile, IconPlus, IconUsers, IconX } from '../components/icons'
import { Button, Card, ConfirmDialog, Field, Input } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { carDisplayName } from '../lib/reminders'

export default function SharePage() {
  const { id: carId } = useParams()
  const { cars, refresh } = useCars()
  const { user, isCloud } = useAuth()
  const { toast } = useToast()
  const car = cars.find((c) => c.id === carId)

  const [email, setEmail] = useState('')
  const [removeEmail, setRemoveEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!car) return <div className="px-4"><PageHeader title="שיתוף הרכב" /></div>

  const isOwner = car.ownerId === user?.uid

  const add = async () => {
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast('כתובת אימייל לא תקינה', 'error')
      return
    }
    if (car.sharedWith.includes(normalized) || normalized === user?.email?.toLowerCase()) {
      toast('המשתמש כבר משותף', 'info')
      return
    }
    setBusy(true)
    try {
      await repo.saveCar({ ...car, sharedWith: [...car.sharedWith, normalized], updatedAt: Date.now() })
      await refresh()
      setEmail('')
      toast('הרכב שותף בהצלחה')
    } catch {
      toast('השיתוף נכשל, נסו שוב', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removeEmail) return
    await repo.saveCar({
      ...car,
      sharedWith: car.sharedWith.filter((e) => e !== removeEmail),
      updatedAt: Date.now(),
    })
    await refresh()
    setRemoveEmail(null)
    toast('השיתוף הוסר')
  }

  return (
    <div className="px-4">
      <PageHeader title="שיתוף הרכב" subtitle={carDisplayName(car)} />

      <div className="space-y-4 pb-8">
        {!isCloud && (
          <Card className="!bg-warn-soft text-sm leading-relaxed">
            <strong>מצב דמו מקומי:</strong> שיתוף אמיתי בין משתמשים דורש חיבור Firebase (ראו
            README). בינתיים אפשר לנהל כאן את רשימת המשותפים והיא תסונכרן ברגע שהענן יחובר.
          </Card>
        )}

        {/* car passport export (great for selling) */}
        <Link to={`/car/${car.id}/passport`}>
          <Card onClick={() => {}} className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink">
              <IconFile size={22} />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-black">דרכון רכב (PDF)</span>
              <span className="block text-sm text-ink-3">מסמך מסודר עם כל ההיסטוריה — מצוין למכירת הרכב</span>
            </span>
            <IconChevronLeft size={22} className="text-ink-3" />
          </Card>
        </Link>

        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-card-2">
              <IconUsers size={20} />
            </span>
            <div>
              <p className="font-bold">מי רואה את הרכב הזה?</p>
              <p className="text-xs text-ink-3">
                משתמשים משותפים רואים ועורכים טיפולים, ביטוחים ומסמכים
              </p>
            </div>
          </div>

          <ul className="divide-y divide-line">
            <li className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold">{car.ownerEmail || 'בעלים'}</p>
                <p className="text-xs text-ink-3">בעלים</p>
              </div>
            </li>
            {car.sharedWith.map((e) => (
              <li key={e} className="flex items-center justify-between py-3">
                <p className="text-sm font-semibold" dir="ltr">
                  {e}
                </p>
                {isOwner && (
                  <button
                    aria-label={`הסרת ${e}`}
                    onClick={() => setRemoveEmail(e)}
                    className="flex size-9 items-center justify-center rounded-full bg-card-2 text-danger active:scale-90"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        {isOwner ? (
          <Card className="space-y-3">
            <Field label="הוספת משתמש לפי אימייל (חשבון Google)">
              <Input
                type="email"
                inputMode="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@gmail.com"
                onKeyDown={(e) => e.key === 'Enter' && void add()}
              />
            </Field>
            <Button className="w-full" onClick={() => void add()} disabled={busy || !email.trim()}>
              <IconPlus size={18} />
              שיתוף
            </Button>
          </Card>
        ) : (
          <Card className="text-sm text-ink-2">רק בעלי הרכב יכולים לנהל שיתוף.</Card>
        )}
      </div>

      {removeEmail && (
        <ConfirmDialog
          title="להסיר את השיתוף?"
          message={`${removeEmail} לא יוכל יותר לצפות ברכב ובנתונים שלו.`}
          confirmLabel="הסרה"
          onConfirm={() => void remove()}
          onCancel={() => setRemoveEmail(null)}
        />
      )}
    </div>
  )
}
