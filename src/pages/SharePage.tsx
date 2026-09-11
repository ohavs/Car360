import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import {
  IconCheck,
  IconChevronLeft,
  IconFile,
  IconLink,
  IconPlus,
  IconTrash,
  IconUsers,
  IconX,
} from '../components/icons'
import { Button, Card, ConfirmDialog, Field, Input } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { carDisplayName } from '../lib/reminders'
import { newToken } from '../lib/utils'
import type { PublicPassport } from '../types'

export default function SharePage() {
  const { id: carId } = useParams()
  const { cars, refresh } = useCars()
  const { user, isCloud } = useAuth()
  const { toast } = useToast()
  const car = cars.find((c) => c.id === carId)

  const [email, setEmail] = useState('')
  const [removeEmail, setRemoveEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revokeLink, setRevokeLink] = useState(false)

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

  const publicUrl = car.publicToken ? `${location.origin}/p/${car.publicToken}` : null

  const buildSnapshot = async (token: string): Promise<PublicPassport> => {
    const [services, insurances] = await Promise.all([
      repo.listServices(car.id),
      repo.listInsurances(car.id),
    ])
    return {
      token,
      car: {
        nickname: car.nickname,
        make: car.make,
        model: car.model,
        year: car.year,
        plate: car.plate,
        color: car.color,
        vin: car.vin,
        fuelType: car.fuelType,
        imageUrl: car.imageUrl,
        testExpiry: car.testExpiry,
      },
      services,
      insurances,
      publishedAt: Date.now(),
    }
  }

  const publishLink = async (isUpdate: boolean) => {
    setLinkBusy(true)
    try {
      const token = car.publicToken ?? newToken()
      await repo.publishPassport(await buildSnapshot(token))
      if (!car.publicToken) {
        await repo.saveCar({ ...car, publicToken: token, updatedAt: Date.now() })
        await refresh()
      }
      toast(isUpdate ? 'הקישור עודכן לנתונים העדכניים' : 'קישור ציבורי נוצר')
    } catch {
      toast('הפעולה נכשלה, נסו שוב', 'error')
    } finally {
      setLinkBusy(false)
    }
  }

  const revoke = async () => {
    if (!car.publicToken) return
    setLinkBusy(true)
    try {
      await repo.unpublishPassport(car.publicToken)
      await repo.saveCar({ ...car, publicToken: undefined, updatedAt: Date.now() })
      await refresh()
      toast('הקישור בוטל')
    } catch {
      toast('הביטול נכשל, נסו שוב', 'error')
    } finally {
      setLinkBusy(false)
      setRevokeLink(false)
    }
  }

  const copyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast('ההעתקה נכשלה — סמנו והעתיקו ידנית', 'info')
    }
  }

  return (
    <div className="px-4">
      <PageHeader title="שיתוף הרכב" subtitle={carDisplayName(car)} carId={carId} />

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

        {/* public read-only passport link */}
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2">
              <IconLink size={20} />
            </span>
            <div>
              <p className="font-bold">קישור ציבורי לצפייה</p>
              <p className="text-xs text-ink-3">
                כל מי שיש לו את הקישור רואה דרכון לקריאה בלבד — בלי חשבון. לא כולל מסמכים או פרטי קשר.
              </p>
            </div>
          </div>

          {publicUrl ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  dir="ltr"
                  value={publicUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 !text-xs"
                />
                <button
                  onClick={() => void copyLink()}
                  aria-label="העתקת הקישור"
                  className="flex size-11 shrink-0 items-center justify-center rounded-field bg-accent text-accent-ink active:scale-90"
                >
                  {copied ? <IconCheck size={18} /> : <IconLink size={18} />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => void publishLink(true)} disabled={linkBusy}>
                  עדכון הקישור
                </Button>
                <Button
                  variant="ghost"
                  className="!text-danger"
                  onClick={() => setRevokeLink(true)}
                  disabled={linkBusy}
                >
                  <IconTrash size={16} />
                  ביטול
                </Button>
              </div>
              <p className="text-[11px] text-ink-3">
                הקישור מציג צילום מצב מרגע היצירה/עדכון. הוספתם טיפול? לחצו “עדכון הקישור”.
              </p>
            </>
          ) : (
            <Button className="w-full" onClick={() => void publishLink(false)} disabled={linkBusy}>
              <IconLink size={18} />
              {linkBusy ? 'יוצר…' : 'יצירת קישור ציבורי'}
            </Button>
          )}
        </Card>

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

      {revokeLink && (
        <ConfirmDialog
          title="לבטל את הקישור הציבורי?"
          message="כל מי שיש לו את הקישור לא יוכל יותר לצפות בדרכון הרכב."
          confirmLabel="ביטול הקישור"
          onConfirm={() => void revoke()}
          onCancel={() => setRevokeLink(false)}
        />
      )}
    </div>
  )
}
