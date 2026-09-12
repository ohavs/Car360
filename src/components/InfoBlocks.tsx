import { useState } from 'react'
import { BottomSheet, ConfirmDialog, Field, Input, SaveButton, Switch } from './ui'
import { DateInput, Select } from './pickers'
import { IconCalendar, IconPlus, IconTrash } from './icons'
import { newId } from '../lib/utils'
import type { BlockType, InfoBlock } from '../types'

export const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'text', label: 'טקסט חופשי' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'phone', label: 'טלפון' },
  { value: 'link', label: 'קישור' },
]

export const CAR_BLOCK_SUGGESTIONS = [
  { title: 'קוד לרכב', type: 'text' as BlockType },
  { title: 'לחץ אוויר בצמיגים', type: 'text' as BlockType },
  { title: 'מספר פוליסה', type: 'text' as BlockType },
  { title: 'טלפון מוסך', type: 'phone' as BlockType },
  { title: 'טלפון סוכן ביטוח', type: 'phone' as BlockType },
  { title: 'תוקף חנייה שמורה', type: 'date' as BlockType },
]

export const INSURANCE_BLOCK_SUGGESTIONS = [
  { title: 'חברת ביטוח', type: 'text' as BlockType },
  { title: 'מספר פוליסה', type: 'text' as BlockType },
  { title: 'סיום תוקף', type: 'date' as BlockType },
  { title: 'עלות שנתית', type: 'number' as BlockType },
  { title: 'שם הסוכן', type: 'text' as BlockType },
  { title: 'טלפון הסוכן', type: 'phone' as BlockType },
  { title: 'השתתפות עצמית', type: 'number' as BlockType },
]

export type BlockSuggestion = { title: string; type: BlockType }

/** The "free hand" section: the user names a field, picks its type and fills
 *  it in. Shared so every record type can carry whatever its owner cares
 *  about, instead of only the columns the schema happened to guess. */
export function BlockList({
  blocks,
  onChange,
  suggestions = CAR_BLOCK_SUGGESTIONS,
  title = 'בלוקים של מידע',
  empty = 'יד חופשית: הוסיפו כל פרט שחשוב לכם — מספר פוליסה, טלפון של הסוכן, השתתפות עצמית…',
  removeNote = 'הבלוק יוסר מהרשומה.',
}: {
  blocks: InfoBlock[]
  onChange: (blocks: InfoBlock[]) => void
  suggestions?: BlockSuggestion[]
  title?: string
  empty?: string
  removeNote?: string
}) {
  const [editing, setEditing] = useState<InfoBlock | null>(null)
  const [toDelete, setToDelete] = useState<InfoBlock | null>(null)

  const put = (b: InfoBlock) => {
    onChange(blocks.some((x) => x.id === b.id) ? blocks.map((x) => (x.id === b.id ? b : x)) : [...blocks, b])
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <button
          type="button"
          aria-label="הוספת בלוק מידע"
          onClick={() => setEditing({ id: newId(), title: '', type: 'text', value: '' })}
          className="flex items-center gap-1 rounded-full bg-card-2 px-3 py-1.5 text-sm font-semibold text-ink-2 active:scale-95"
        >
          <IconPlus size={16} />
          הוספה
        </button>
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-3">{empty}</p>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
              <button type="button" onClick={() => setEditing(b)} className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="truncate text-xs text-ink-3">
                  {BLOCK_TYPES.find((t) => t.value === b.type)?.label} · {b.value || 'ללא ערך'}
                </p>
              </button>
              <button
                type="button"
                aria-label={`מחיקת ${b.title}`}
                onClick={() => setToDelete(b)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-danger active:scale-90"
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BlockEditorSheet
          block={editing}
          suggestions={suggestions}
          onSave={put}
          onClose={() => setEditing(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="להסיר את הבלוק?"
          message={`"${toDelete.title}" ${removeNote}`}
          confirmLabel="הסרה"
          onConfirm={() => {
            onChange(blocks.filter((x) => x.id !== toDelete.id))
            setToDelete(null)
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

export function BlockEditorSheet({
  block,
  suggestions = CAR_BLOCK_SUGGESTIONS,
  onSave,
  onClose,
}: {
  block: InfoBlock
  suggestions?: BlockSuggestion[]
  onSave: (b: InfoBlock) => void
  onClose: () => void
}) {
  const [b, setB] = useState<InfoBlock>(block)
  const isNew = !block.title

  return (
    <BottomSheet
      title={isNew ? 'בלוק מידע חדש' : 'עריכת בלוק'}
      onClose={onClose}
      dirty={JSON.stringify(b) !== JSON.stringify(block)}
    >
      <div className="space-y-4">
        {isNew && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setB({ ...b, title: s.title, type: s.type })}
                className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-2 ring-1 ring-line active:scale-95"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
        <Field label="כותרת">
          <Input value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} placeholder="למשל: מספר פוליסה" />
        </Field>
        <Field label="סוג">
          <Select
            title="סוג הבלוק"
            value={b.type}
            onChange={(v) => setB({ ...b, type: v as BlockType, value: '' })}
            options={BLOCK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
        <Field label="ערך">
          {b.type === 'date' ? (
            <DateInput value={b.value} onChange={(v) => setB({ ...b, value: v })} />
          ) : (
            <Input
              value={b.value}
              onChange={(e) => setB({ ...b, value: e.target.value })}
              type={b.type === 'number' ? 'number' : b.type === 'phone' ? 'tel' : b.type === 'link' ? 'url' : 'text'}
              inputMode={b.type === 'number' ? 'decimal' : b.type === 'phone' ? 'tel' : undefined}
              dir={b.type === 'phone' || b.type === 'link' ? 'ltr' : undefined}
              placeholder={b.type === 'link' ? 'https://…' : ''}
            />
          )}
        </Field>
        {b.type === 'date' && (
          <div className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-center gap-2">
              <IconCalendar size={20} />
              <div>
                <p className="text-sm font-semibold">תזכורת לתאריך הזה</p>
                <p className="text-xs text-ink-3">יופיע במסך התזכורות ובהתראות</p>
              </div>
            </div>
            <Switch checked={Boolean(b.remind)} onChange={(v) => setB({ ...b, remind: v })} label="תזכורת" />
          </div>
        )}
        <SaveButton
          className="w-full"
          requirements={[{ ok: Boolean(b.title.trim()), message: 'צריך לתת שם לבלוק' }]}
          onSave={() => onSave({ ...b, title: b.title.trim() })}
        >
          שמירת הבלוק
        </SaveButton>
      </div>
    </BottomSheet>
  )
}
