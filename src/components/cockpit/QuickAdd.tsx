import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import GlassPanel from './GlassPanel'
import { IconBell, IconPlus, IconWrench, IconX } from '../icons'
import { Button, Input } from '../ui'
import { DateInput } from '../pickers'
import { useToast } from '../../contexts/ToastContext'
import { repo } from '../../data'
import { newId, todayISO } from '../../lib/utils'

type Mode = 'service' | 'reminder'

/** Record the two most common things — a service and a reminder — without
 *  leaving the home screen. Deliberately two fields each: anything longer
 *  belongs in the full editor, which the "פרטים נוספים" link opens. */
export default function QuickAdd({
  carId,
  onAdded,
}: {
  carId: string
  onAdded: (kind: Mode) => void
}) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const reset = () => {
    setMode(null)
    setTitle('')
    setCost('')
    setDueDate(todayISO())
  }

  const save = async () => {
    const kind = mode
    if (!kind || !title.trim()) return
    setSaving(true)
    const now = Date.now()
    try {
      if (kind === 'service') {
        await repo.saveService({
          id: newId(),
          carId,
          title: title.trim(),
          date: todayISO(),
          cost: cost ? Number(cost) : undefined,
          photos: [],
          createdAt: now,
          updatedAt: now,
        })
        toast('הטיפול נוסף')
      } else {
        await repo.saveReminder({
          id: newId(),
          carId,
          title: title.trim(),
          dueDate,
          done: false,
          createdAt: now,
          updatedAt: now,
        })
        toast('התזכורת נוספה')
      }
      reset()
      onAdded(kind)
    } catch {
      toast('השמירה נכשלה, נסו שוב', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassPanel className="!p-3">
      <AnimatePresence mode="wait" initial={false}>
        {mode === null ? (
          <motion.div
            key="chips"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <span className="ps-1 text-xs font-bold text-ink-3">הוספה מהירה</span>
            <div className="flex flex-1 justify-end gap-2">
              <Chip icon={<IconWrench size={15} />} label="טיפול" onClick={() => setMode('service')} />
              <Chip icon={<IconBell size={15} />} label="תזכורת" onClick={() => setMode('reminder')} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-3">
                {mode === 'service' ? 'טיפול חדש' : 'תזכורת חדשה'}
              </p>
              <button
                onClick={reset}
                aria-label="ביטול"
                className="flex size-7 items-center justify-center rounded-full bg-card-2 text-ink-3 active:scale-90"
              >
                <IconX size={14} />
              </button>
            </div>

            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
              placeholder={mode === 'service' ? 'מה נעשה? למשל החלפת שמן' : 'מה להזכיר?'}
            />

            <div className="flex items-center gap-2">
              <div className="flex-1">
                {mode === 'service' ? (
                  <Input
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    inputMode="numeric"
                    placeholder="עלות (אופציונלי)"
                  />
                ) : (
                  <DateInput value={dueDate} onChange={setDueDate} />
                )}
              </div>
              <Button onClick={() => void save()} disabled={saving || !title.trim()} className="!px-5">
                <IconPlus size={16} />
                הוספה
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

function Chip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-white/55 px-3.5 py-1.5 text-xs font-bold text-ink ring-1 ring-white/50 dark:bg-white/10 dark:ring-white/10"
    >
      {icon}
      {label}
    </motion.button>
  )
}
