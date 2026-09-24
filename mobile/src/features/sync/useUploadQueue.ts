import { useEffect } from 'react'
import { AppState } from 'react-native'
import { onEnqueued, processUploadQueue } from '../../data/uploadQueue'

/** Uploads waiting photos: at launch, on return to the app, and a little
 *  after something new was queued (and keeps trying every minute meanwhile). */
export function useUploadQueue(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const run = () => void processUploadQueue()
    run()
    const app = AppState.addEventListener('change', (s) => s === 'active' && run())
    const queued = onEnqueued(() => setTimeout(run, 5000))
    const timer = setInterval(run, 60_000)
    return () => {
      app.remove()
      queued()
      clearInterval(timer)
    }
  }, [enabled])
}
