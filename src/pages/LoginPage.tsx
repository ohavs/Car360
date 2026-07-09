import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { IconGoogle } from '../components/icons'
import CarSilhouette from '../components/cars/CarSilhouette'
import { Spinner } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const { user, loading, signIn, isCloud } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signIn()
    } catch {
      toast('הכניסה נכשלה, נסו שוב', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-6 py-10 pt-safe pb-safe">
      <header className="pt-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-card">
          <span className="size-2 rounded-full bg-ok" />
          Car360
        </span>
        <h1 className="mt-8 text-4xl font-black leading-tight">
          כל הרכבים שלך.
          <br />
          מקום אחד.
        </h1>
        <p className="mx-auto mt-4 max-w-xs leading-relaxed text-ink-2">
          טיפולים, ביטוחים, טסט, מסמכים ותזכורות — מסודרים, משותפים וזמינים מכל מכשיר.
        </p>
      </header>

      <div className="relative py-6">
        <CarSilhouette className="mx-auto h-40 w-auto text-ink drop-shadow-[0_20px_18px_rgb(0_0_0/0.2)]" />
        <div className="absolute bottom-6 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[100%] bg-black/15 blur-md dark:bg-black/40" />
      </div>

      <div className="pb-4">
        <button
          onClick={handleSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-accent px-6 py-4 text-base font-semibold text-accent-ink shadow-float transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Spinner className="size-5 border-2 border-accent-ink/30 border-t-accent-ink" /> : <span className="flex size-6 items-center justify-center rounded-full bg-white"><IconGoogle size={15} /></span>}
          כניסה עם Google
        </button>
        {!isCloud && (
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
            מצב דמו מקומי — Firebase לא הוגדר עדיין, הנתונים נשמרים על המכשיר בלבד.
            <br />
            להפעלת סנכרון ושיתוף ראו את README בפרויקט.
          </p>
        )}
      </div>
    </div>
  )
}
