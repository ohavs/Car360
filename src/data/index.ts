import { isFirebaseConfigured } from '../lib/firebase'
import { firebaseRepo } from './firebaseRepo'
import { localRepo } from './localRepo'
import type { Repo } from './repo'

export const repo: Repo = isFirebaseConfigured ? firebaseRepo : localRepo
export { authService } from './auth'
export type { Repo } from './repo'
