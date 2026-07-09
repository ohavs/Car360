import { motion } from 'motion/react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import CarSilhouette from '../components/cars/CarSilhouette'
import { IconGoogle } from '../components/icons'
import { Spinner } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const FEATURES = ['טיפולים', 'ביטוחים', 'טסט', 'מסמכים', 'תזכורות', 'שיתוף']

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-clip px-6 pb-safe pt-safe">
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="pt-12 text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold shadow-card ring-1 ring-line">
          <span className="size-2 rounded-full bg-cta" />
          Car360
        </span>
        <h1 className="mt-7 text-[2.75rem] font-black leading-[1.08]">
          כל הרכבים שלך.
          <br />
          <span className="text-cta">מקום אחד.</span>
        </h1>
      </motion.header>

      {/* feature chips */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } } }}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {FEATURES.map((f) => (
          <motion.span
            key={f}
            variants={{
              hidden: { opacity: 0, y: 10, scale: 0.9 },
              show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 26 } },
            }}
            className="rounded-full bg-card px-3.5 py-1.5 text-[13px] font-bold text-ink-2 shadow-card"
          >
            {f}
          </motion.span>
        ))}
      </motion.div>

      {/* hero car drives in */}
      <div className="relative flex flex-1 items-center justify-center py-8">
        <motion.div
          initial={{ x: 160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.35 }}
          className="w-full"
        >
          <CarSilhouette className="mx-auto h-auto w-full max-w-[340px] text-ink drop-shadow-[0_20px_18px_rgb(15_23_42/0.22)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="absolute bottom-10 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[100%] bg-black/15 blur-md dark:bg-black/50"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.5 }}
        className="pb-8"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-accent px-6 py-4.5 text-base font-bold text-accent-ink shadow-float disabled:opacity-60"
        >
          {busy ? (
            <Spinner className="size-5 border-2 border-accent-ink/30 border-t-accent-ink" />
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full bg-white">
              <IconGoogle size={15} />
            </span>
          )}
          כניסה עם Google
        </motion.button>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
          {isCloud
            ? 'הנתונים שלך מסונכרנים ומאובטחים בחשבון Google שלך'
            : 'מצב דמו מקומי — הנתונים נשמרים על המכשיר בלבד'}
        </p>
      </motion.div>
    </div>
  )
}
