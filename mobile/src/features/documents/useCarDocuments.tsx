import { FileText, Pencil, Trash2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import type { CarDocument, DocumentCategory } from '@shared/types'
import { useLiveSub } from '../../data/live'
import { deleteRecord } from '../../data/mutations'
import { radius } from '../../theme/tokens'
import { ConfirmDialog, EmptyState, FilterChips, PhotoViewer, Skeleton, useSnackbar, ViewerAction } from '../../ui'
import { DocumentGrid } from '../cars/DocumentGrid'
import { CATEGORIES, DocumentSheet } from './DocumentSheet'

type Filter = 'הכל' | DocumentCategory
const FILTERS: Filter[] = ['הכל', ...CATEGORIES]

/**
 * A car's documents: category filter, the grid, the viewer (edit/delete in
 * its top bar), long-press to edit, and the add sheet. Used by the car's
 * documents screen and by the documents tab; the screen supplies the FAB
 * and calls `add()`.
 */
export function useCarDocuments(id: string | undefined) {
  const snack = useSnackbar()
  const { items, loading } = useLiveSub<CarDocument>(id, 'documents')
  const [filter, setFilter] = useState<Filter>('הכל')
  const [viewing, setViewing] = useState<number | null>(null)
  // null: closed · 'new' · a document to edit
  const [editing, setEditing] = useState<CarDocument | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CarDocument | null>(null)
  const shown = useMemo(
    () => [...items].filter((d) => filter === 'הכל' || d.category === filter).sort((a, b) => b.createdAt - a.createdAt),
    [items, filter],
  )

  const remove = async (doc: CarDocument) => {
    setDeleting(null)
    setViewing(null)
    try {
      await deleteRecord('documents', doc)
      snack('המסמך נמחק', { tone: 'info' })
    } catch {
      snack('המחיקה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }

  const content = (
    <>
      <FilterChips<Filter> value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f }))} />
      {loading ? (
        <Skeleton height={180} radius={radius.card} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filter === 'הכל' ? 'אין מסמכים עדיין' : `אין מסמכים בקטגוריית ${filter}`}
          subtitle="רישיון רכב, פוליסות, קבלות — צלמו פעם אחת והם תמיד בכיס"
        />
      ) : (
        <DocumentGrid docs={shown} onOpen={setViewing} onLongPress={setEditing} />
      )}

      {viewing !== null && (
        <PhotoViewer
          photos={shown.map((d) => d.imageUrl)}
          index={viewing}
          title={shown[viewing]?.title}
          onClose={() => setViewing(null)}
          actions={(i) => (
            <>
              <ViewerAction
                icon={Pencil}
                label="עריכה"
                onPress={() => {
                  setViewing(null)
                  setEditing(shown[i])
                }}
              />
              <ViewerAction icon={Trash2} label="מחיקה" onPress={() => setDeleting(shown[i])} />
            </>
          )}
        />
      )}
      {editing && id && <DocumentSheet carId={id} doc={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        visible={deleting !== null}
        title="למחוק את המסמך?"
        message={`"${deleting?.title ?? ''}" יימחק לצמיתות.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      />
    </>
  )
  return { content, add: () => setEditing('new') }
}
