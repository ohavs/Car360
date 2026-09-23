import { CheckCircle2, Download, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { formatBytes } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, Card, ProgressBar, Text } from '../../ui'
import { buildChannel, installedVersion, type ReleaseInfo } from './releases'
import { useUpdates } from './UpdateProvider'

/** Settings → "App updates": the current version, a check button, and the
 *  whole download → install flow in place. */
export function UpdatePanel() {
  const { phase, check, start, cancel, openPermissionSettings } = useUpdates()
  const { colors } = useTheme()
  const release = 'release' in phase ? phase.release : undefined

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.surfaceContainer }]}>
          <Download size={20} color={colors.onSurface} strokeWidth={1.9} />
        </View>
        <View style={styles.headerText}>
          <Text variant="bodyStrong">עדכוני אפליקציה</Text>
          <Text variant="caption" tone="muted">
            גרסה {installedVersion.name} ({installedVersion.code})
            {buildChannel === 'beta' ? ' · ערוץ בטא' : ''}
          </Text>
        </View>
      </View>

      {phase.kind === 'upToDate' && (
        <StatusLine icon={CheckCircle2} tone="success" text="יש לך את הגרסה האחרונה" />
      )}

      {phase.kind === 'error' && <StatusLine icon={TriangleAlert} tone="danger" text={phase.message} />}

      {release && <ReleaseSummary release={release} />}

      {phase.kind === 'needsPermission' && (
        <View style={[styles.note, { backgroundColor: colors.warningContainer }]}>
          <ShieldCheck size={20} color={colors.warning} strokeWidth={2} />
          <Text variant="caption" tone="onSurface" style={styles.noteText}>
            {'כדי להתקין עדכונים, אנדרואיד צריך אישור חד-פעמי: במסך שייפתח הפעילו את "התרה ממקור זה" וחזרו לכאן — העדכון ימשיך לבד.'}
          </Text>
        </View>
      )}

      {phase.kind === 'downloading' && (
        <View style={styles.progress}>
          <ProgressBar value={phase.progress} />
          <Text variant="caption" tone="muted">
            מוריד… {Math.round(phase.progress * 100)}% מתוך {formatBytes(phase.release.apk.size)}
          </Text>
        </View>
      )}

      {phase.kind === 'installing' && (
        <StatusLine icon={Sparkles} tone="brand" text="מתקין… האפליקציה תיסגר לרגע ותחזור בגרסה החדשה" />
      )}
      {phase.kind === 'confirming' && (
        <StatusLine icon={Sparkles} tone="brand" text='אשרו "עדכון" בחלון של אנדרואיד' />
      )}

      <View style={styles.actions}>
        {(phase.kind === 'idle' || phase.kind === 'upToDate' || (phase.kind === 'error' && !release)) && (
          <Button label="בדיקת עדכונים" icon={RefreshCw} variant="tonal" onPress={() => void check()} />
        )}
        {phase.kind === 'checking' && <Button label="בודק…" variant="tonal" loading onPress={() => {}} />}
        {(phase.kind === 'available' || (phase.kind === 'error' && release)) && (
          <Button label="עדכון עכשיו" icon={Download} variant="brand" size="large" onPress={() => void start()} />
        )}
        {phase.kind === 'needsPermission' && (
          <Button label="מתן הרשאה" icon={ShieldCheck} variant="brand" size="large" onPress={openPermissionSettings} />
        )}
        {phase.kind === 'downloading' && <Button label="ביטול ההורדה" variant="text" onPress={cancel} />}
      </View>
    </Card>
  )
}

function ReleaseSummary({ release }: { release: ReleaseInfo }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.release, { backgroundColor: colors.brandContainer }]}>
      <Text variant="bodyStrong">
        גרסה {release.versionName} ({release.versionCode}) זמינה
      </Text>
      {release.notes.length > 0 && (
        <View style={styles.notes}>
          {release.notes.slice(0, 8).map((note, i) => (
            <Text key={i} variant="caption" tone="onSurfaceVariant">
              • {note}
            </Text>
          ))}
        </View>
      )}
      <Text variant="caption" tone="muted">
        {formatBytes(release.apk.size)}
      </Text>
    </View>
  )
}

function StatusLine({
  icon: Icon,
  tone,
  text,
}: {
  icon: typeof CheckCircle2
  tone: 'success' | 'danger' | 'brand'
  text: string
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.status}>
      <Icon size={18} color={colors[tone]} strokeWidth={2.2} />
      <Text variant="label" tone={tone} style={styles.noteText}>
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerText: {
    flex: 1,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  release: {
    borderRadius: radius.field,
    padding: space.md,
    gap: space.xs,
  },
  notes: {
    gap: 2,
  },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    borderRadius: radius.field,
    padding: space.md,
  },
  noteText: {
    flex: 1,
  },
  progress: {
    gap: space.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  actions: {
    gap: space.sm,
  },
})
