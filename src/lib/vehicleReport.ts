/** The deep vehicle report — shared with the Android app. The web keeps its
 *  discovered-sources cache in localStorage. */
import { reportCache } from '../../shared/vehicleReport'

reportCache.get = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
reportCache.set = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage full or blocked — the report just rediscovers its sources
  }
}

export * from '../../shared/vehicleReport'
