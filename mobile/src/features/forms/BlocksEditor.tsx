import { CalendarDays, Hash, Link2, Phone, Plus, StickyNote, Trash2, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { BlockType, InfoBlock } from '@shared/types'
import { formatDate, newId } from '@shared/utils'
import { space } from '../../theme/tokens'
import {
  Button,
  Card,
  ConfirmDialog,
  DateField,
  ListItem,
  SectionHeader,
  SegmentedButtons,
  Sheet,
  Switch,
  TextField,
  type ChoiceOption,
} from '../../ui'

export const BLOCK_ICON: Record<BlockType, LucideIcon> = {
  text: StickyNote,
  number: Hash,
  date: CalendarDays,
  phone: Phone,
  link: Link2,
}

const TYPES: ChoiceOption<BlockType>[] = [
  { value: 'text', label: 'טקסט' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'phone', label: 'טלפון' },
  { value: 'link', label: 'קישור' },
]

/** "יד חופשית": the user's own named fields — anything the fixed form lacks. */
export function BlocksEditor({
  blocks,
  onChange,
  title = 'בלוקי מידע',
}: {
  blocks: InfoBlock[]
  onChange: (blocks: InfoBlock[]) => void
  title?: string
}) {
  const [editing, setEditing] = useState<InfoBlock | null>(null)

  const commit = (b: InfoBlock) => {
    onChange(blocks.some((x) => x.id === b.id) ? blocks.map((x) => (x.id === b.id ? b : x)) : [...blocks, b])
    setEditing(null)
  }

  return (
    <View style={styles.root}>
      <SectionHeader title={title} />
      {blocks.length > 0 && (
        <Card padded={false}>
          {blocks.map((b) => (
            <ListItem
              key={b.id}
              icon={BLOCK_ICON[b.type]}
              title={b.title || 'ללא שם'}
              subtitle={(b.type === 'date' ? formatDate(b.value) : b.value) || '—'}
              onPress={() => setEditing(b)}
            />
          ))}
        </Card>
      )}
      <Button
        label="הוספת שדה משלכם"
        icon={Plus}
        variant="outlined"
        onPress={() => setEditing({ id: newId(), title: '', type: 'text', value: '' })}
      />
      {editing && (
        <BlockSheet
          key={editing.id}
          block={editing}
          isNew={!blocks.some((b) => b.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={commit}
          onDelete={() => {
            onChange(blocks.filter((b) => b.id !== editing.id))
            setEditing(null)
          }}
        />
      )}
    </View>
  )
}

function BlockSheet({
  block,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  block: InfoBlock
  isNew: boolean
  onClose: () => void
  onSave: (b: InfoBlock) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(block)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(block)
  const set = (patch: Partial<InfoBlock>) => setDraft((d) => ({ ...d, ...patch }))

  const save = () => {
    if (!draft.title.trim()) return setError('תנו לשדה שם')
    onSave({ ...draft, title: draft.title.trim(), value: draft.value.trim(), remind: draft.type === 'date' ? draft.remind : undefined })
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      dirty={dirty}
      title={isNew ? 'שדה חדש' : 'עריכת שדה'}
      footer={
        <View style={styles.footer}>
          {!isNew && <Button label="מחיקה" icon={Trash2} variant="text" onPress={() => setConfirming(true)} />}
          <Button label={isNew ? 'הוספה' : 'עדכון'} onPress={save} style={styles.flex} />
        </View>
      }
    >
      <TextField
        label="שם השדה"
        placeholder="למשל: קוד רדיו, מוסך קבוע"
        value={draft.title}
        onChangeText={(title) => {
          set({ title })
          setError(null)
        }}
        error={error}
      />
      <SegmentedButtons label="סוג" value={draft.type} onChange={(type) => set({ type, value: '' })} options={TYPES} />
      {draft.type === 'date' ? (
        <>
          <DateField label="תאריך" value={draft.value} onChange={(value) => set({ value })} clearable />
          <Switch label="להזכיר לפני התאריך" value={Boolean(draft.remind)} onValueChange={(remind) => set({ remind })} />
        </>
      ) : (
        <TextField
          label="ערך"
          value={draft.value}
          onChangeText={(value) => set({ value })}
          keyboardType={draft.type === 'number' ? 'decimal-pad' : draft.type === 'phone' ? 'phone-pad' : draft.type === 'link' ? 'url' : 'default'}
          autoCapitalize="none"
          ltr={draft.type === 'phone' || draft.type === 'link' || draft.type === 'number'}
          multiline={draft.type === 'text'}
        />
      )}
      <ConfirmDialog
        visible={confirming}
        title="למחוק את השדה?"
        message={`"${block.title}" יימחק מהטופס. השינוי יישמר כשתשמרו את הטופס.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onDelete()
        }}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  footer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  flex: { flex: 1 },
})
