import { useRouter } from 'expo-router'
import { Trash2, X } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { AppBar, Button, ConfirmDialog, IconButton, Screen, useSnackbar } from '../../ui'

/**
 * The frame of every full-screen editor: ✕ on the start side, the title,
 * "שמירה" on the end side, and an optional delete that always asks first.
 * Leaving with unsaved changes is guarded by the caller's useFormGuard.
 */
export function FormScreen({
  title,
  subtitle,
  saving,
  onSave,
  deleteTitle,
  deleteMessage,
  onDelete,
  guard,
  children,
}: {
  title: string
  subtitle?: string
  saving: boolean
  onSave: () => void
  deleteTitle?: string
  deleteMessage?: string
  onDelete?: () => void
  /** the dialog returned by useFormGuard */
  guard: ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Screen
      header={
        <AppBar
          title={title}
          subtitle={subtitle}
          leading={<IconButton icon={X} label="סגירה" onPress={() => router.back()} />}
          actions={
            <>
              {onDelete && <IconButton icon={Trash2} label="מחיקה" onPress={() => setConfirmDelete(true)} />}
              <Button label="שמירה" onPress={onSave} loading={saving} />
            </>
          }
        />
      }
    >
      {children}
      {guard}
      {onDelete && (
        <ConfirmDialog
          visible={confirmDelete}
          title={deleteTitle ?? 'למחוק?'}
          message={deleteMessage ?? 'אי אפשר לשחזר אחרי המחיקה.'}
          confirmLabel="מחיקה"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false)
            onDelete()
          }}
        />
      )}
    </Screen>
  )
}

/** Runs a save, reporting failure in a snackbar with "retry". */
export function useSaver() {
  const snack = useSnackbar()
  const [saving, setSaving] = useState(false)
  const run = async (work: () => Promise<void>, failure = 'השמירה נכשלה — בדקו את החיבור ונסו שוב') => {
    if (saving) return
    setSaving(true)
    try {
      await work()
    } catch {
      snack(`${failure} — בדקו את החיבור ונסו שוב`, { tone: 'error', action: { label: 'נסו שוב', onPress: () => void run(work, failure) } })
    } finally {
      setSaving(false)
    }
  }
  return { saving, run }
}
