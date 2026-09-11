import { motion } from 'motion/react'
import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import { IconCheck, IconLayoutBento, IconLayoutGrid, IconLayoutStack, IconMoon, IconSparkles } from '../components/icons'
import { Card, Switch, spring } from '../components/ui'
import { useTheme } from '../contexts/ThemeContext'
import { PALETTES, SKINS } from '../lib/palettes'
import { setHomeLayout, useHomeLayout, type HomeLayoutId } from '../lib/homeLayout'
import { cn } from '../lib/utils'

const LAYOUT_OPTIONS: { id: HomeLayoutId; label: string; hint: string; icon: typeof IconLayoutBento }[] = [
  { id: 'bento', label: 'משבצות', hint: 'ברירת מחדל', icon: IconLayoutBento },
  { id: 'stack', label: 'טור יחיד', hint: 'גדול וברור', icon: IconLayoutStack },
  { id: 'compact', label: 'קומפקטי', hint: 'הכל במסך אחד', icon: IconLayoutGrid },
]

/** Everything that changes how the app looks, in one place — so Settings can
 *  stay a short list of things you actually come to change. */
export default function DesignPage() {
  const { theme, toggle, palette, setPalette, skin, setSkin, accent, setAccent, glow, setGlow, lite, setLite, restyling } =
    useTheme()
  const layout = useHomeLayout()

  return (
    <div className="px-4">
      <PageHeader title="עיצוב ותצוגה" subtitle="צבעים, שפת עיצוב ופריסת דף הבית" />

      <div className="space-y-4 pb-8">
        <Card className="divide-y divide-line !p-0">
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink">
              <IconMoon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">מצב כהה</span>
              <span className="block text-xs text-ink-3">החלפה בין עיצוב בהיר לכהה</span>
            </span>
            <Switch checked={theme === 'dark'} onChange={toggle} label="מצב כהה" />
          </div>
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink">
              <IconSparkles size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">מצב מהיר</span>
              <span className="block text-xs text-ink-3">
                מכבה טשטוש וזוהר — גלילה חלקה יותר במכשירים ישנים (במכשיר הזה בלבד)
              </span>
            </span>
            <Switch checked={lite} onChange={setLite} label="מצב מהיר" />
          </div>
        </Card>

        {/* home layout */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-black">פריסת דף הבית</h2>
            <p className="text-xs text-ink-3">כמה מידע להציג במסך הראשי</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_OPTIONS.map((o) => {
              const active = layout === o.id
              return (
                <motion.button
                  key={o.id}
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  onClick={() => setHomeLayout(o.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-3 ring-2 transition-colors',
                    active ? 'bg-cta-soft ring-cta' : 'ring-line',
                  )}
                >
                  <o.icon size={22} className={active ? 'text-cta' : 'text-ink-3'} />
                  <span className="text-xs font-black">{o.label}</span>
                  <span className="text-[10px] text-ink-3">{o.hint}</span>
                </motion.button>
              )
            })}
          </div>
        </Card>

        <Card className="space-y-5">
          {/* palette picker */}
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink-2">פלטת צבעים</p>
            <div className="flex justify-between">
              {PALETTES.map((p) => {
                const active = palette === p.id
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.88 }}
                    transition={spring}
                    disabled={restyling}
                    onClick={() => !active && setPalette(p.id)}
                    aria-label={`פלטת ${p.label}`}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'relative flex size-12 items-center justify-center overflow-hidden rounded-full ring-2 transition-all',
                        active ? 'ring-cta ring-offset-2 ring-offset-card' : 'ring-line',
                      )}
                    >
                      <span className="absolute inset-0" style={{ background: p.preview[2] }} />
                      <span className="absolute inset-y-0 start-0 w-1/2" style={{ background: p.preview[0] }} />
                      <span
                        className="absolute bottom-0 end-0 size-1/2 rounded-tl-full"
                        style={{ background: p.preview[1] }}
                      />
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={spring}
                          className="relative z-10 flex size-5 items-center justify-center rounded-full bg-white text-ink shadow-card"
                        >
                          <IconCheck size={12} className="text-black" />
                        </motion.span>
                      )}
                    </span>
                    <span className={cn('text-[11px] font-bold', active ? 'text-ink' : 'text-ink-3')}>
                      {p.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* design language picker */}
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink-2">שפת עיצוב</p>
            <div className="grid grid-cols-2 gap-3">
              {SKINS.map((s) => {
                const active = skin === s.id
                return (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.96 }}
                    transition={spring}
                    disabled={restyling}
                    onClick={() => !active && setSkin(s.id)}
                    className={cn(
                      'relative overflow-hidden rounded-2xl p-3.5 text-start ring-2 transition-all',
                      active ? 'ring-cta' : 'ring-line',
                    )}
                  >
                    {/* mini preview */}
                    <span
                      className={cn(
                        'mb-2.5 block h-14 overflow-hidden rounded-xl',
                        s.id === 'glass' &&
                          'bg-gradient-to-br from-sky-300/70 via-fuchsia-300/50 to-amber-200/70 dark:from-sky-500/40 dark:via-fuchsia-500/30 dark:to-amber-400/30',
                        s.id === 'minimal' && 'bg-card-2',
                        s.id === 'neu' && 'bg-slate-200 dark:bg-slate-800',
                        s.id === 'aurora' &&
                          'bg-[radial-gradient(circle_at_20%_20%,#6366f1,transparent_45%),radial-gradient(circle_at_80%_30%,#d946ef,transparent_45%),radial-gradient(circle_at_50%_80%,#22d3ee,transparent_45%)] bg-[#0b0820]',
                      )}
                    >
                      {[0, 1].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            'mx-2.5 block h-6 rounded-lg',
                            i === 0 ? 'mt-2.5' : 'mt-1.5 w-2/3',
                            s.id === 'glass' &&
                              'border border-white/60 bg-white/40 shadow-card backdrop-blur-sm dark:border-white/20 dark:bg-white/10',
                            s.id === 'minimal' && 'bg-card shadow-card',
                            s.id === 'neu' &&
                              'bg-slate-200 shadow-[4px_4px_8px_rgb(148_163_184/0.7),-4px_-4px_8px_white] dark:bg-slate-800 dark:shadow-[4px_4px_8px_rgb(0_0_0/0.6),-4px_-4px_8px_rgb(255_255_255/0.05)]',
                            s.id === 'aurora' && 'border border-white/40 bg-white/20 backdrop-blur-sm',
                          )}
                        />
                      ))}
                    </span>
                    <span className="block text-sm font-black">{s.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{s.description}</span>
                    {active && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={spring}
                        className="absolute end-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-cta text-white shadow-card"
                      >
                        <IconCheck size={14} />
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* personal accent color */}
          <AccentPicker accent={accent} setAccent={setAccent} />

          {/* cockpit glow intensity */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink-2">עוצמת זוהר הרכב</p>
              <span className="text-[11px] font-bold text-ink-3">{Math.round(glow * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={140}
              value={Math.round(glow * 100)}
              onChange={(e) => setGlow(Number(e.target.value) / 100)}
              aria-label="עוצמת זוהר הרכב"
              className="h-3 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-l from-cta/80 to-cta/10 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/0.4)] [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/10"
            />
            <p className="mt-1.5 text-[11px] text-ink-3">הזוהר שמאחורי האפליקציה נלקח מצבע הרכב הפעיל</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

const ACCENT_PRESETS = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488',
  '#0284c7', '#4f46e5', '#7c3aed', '#db2777', '#e11d48',
]

function AccentPicker({
  accent,
  setAccent,
}: {
  accent: string | null
  setAccent: (hex: string | null) => void
}) {
  const [hue, setHue] = useState(265)

  return (
    <div>
      <p className="mb-2.5 text-[13px] font-semibold text-ink-2">צבע דגש</p>
      <div className="flex flex-wrap gap-2.5">
        {/* default (palette) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={spring}
          onClick={() => setAccent(null)}
          aria-label="ברירת מחדל"
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-[10px] font-black ring-2 transition-all',
            accent === null ? 'ring-cta ring-offset-2 ring-offset-card' : 'ring-line',
          )}
          style={{ background: 'linear-gradient(135deg,var(--color-accent),var(--color-card-2))' }}
        >
          {accent === null && <IconCheck size={14} className="text-white mix-blend-difference" />}
        </motion.button>

        {ACCENT_PRESETS.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.85 }}
            transition={spring}
            onClick={() => setAccent(c)}
            aria-label={`צבע ${c}`}
            className={cn(
              'flex size-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-all',
              accent === c ? 'ring-ink' : 'ring-transparent',
            )}
            style={{ background: c }}
          >
            {accent === c && <IconCheck size={15} className="text-white" />}
          </motion.button>
        ))}
      </div>

      {/* custom hue slider */}
      <div className="mt-3.5 flex items-center gap-3">
        <span
          className="size-9 shrink-0 rounded-full ring-1 ring-line"
          style={{ background: `hsl(${hue} 72% 52%)` }}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => {
            const h = Number(e.target.value)
            setHue(h)
            setAccent(`hsl(${h} 72% 52%)`)
          }}
          aria-label="בחירת גוון מותאם"
          className="h-3 flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/0.4)] [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/10"
          style={{
            background:
              'linear-gradient(90deg,hsl(0 72% 52%),hsl(60 72% 52%),hsl(120 72% 52%),hsl(180 72% 52%),hsl(240 72% 52%),hsl(300 72% 52%),hsl(360 72% 52%))',
          }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-3">בחרו צבע מוכן או גררו לגוון מותאם אישית</p>
    </div>
  )
}
