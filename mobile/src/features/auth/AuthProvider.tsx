import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut as firebaseSignOut } from '@react-native-firebase/auth'
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import Constants from 'expo-constants'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoUrl?: string
}

interface AuthState {
  user: UserProfile | null
  /** true until Firebase has told us whether someone is signed in */
  loading: boolean
  signIn: () => Promise<SignInResult>
  signOut: () => Promise<void>
}

export type SignInResult = 'signed-in' | 'cancelled'

/** Thrown with a Hebrew message that the login screen can show as-is. */
export class SignInError extends Error {}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => 'cancelled',
  signOut: async () => {},
})

const webClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined

GoogleSignin.configure({ webClientId })

async function signInWithGoogle(): Promise<SignInResult> {
  if (!webClientId) {
    throw new SignInError('הכניסה עם Google עוד לא הוגדרה בגרסה הזו (חסר google-services.json).')
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (response.type === 'cancelled') return 'cancelled'
    const idToken = response.data.idToken
    if (!idToken) throw new SignInError('Google לא החזיר אסימון כניסה. נסו שוב.')
    await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken))
    return 'signed-in'
  } catch (error) {
    if (error instanceof SignInError) throw error
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled'
      if (error.code === statusCodes.IN_PROGRESS) return 'cancelled'
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new SignInError('צריך את Google Play Services כדי להתחבר.')
      }
      // "10" is Google's DEVELOPER_ERROR: this build's signing key is not registered in Firebase
      if (String(error.code) === '10') {
        throw new SignInError('טביעת האצבע של הגרסה לא רשומה ב-Firebase (DEVELOPER_ERROR).')
      }
    }
    throw new SignInError('הכניסה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (u) => {
        setUser(
          u
            ? {
                uid: u.uid,
                displayName: u.displayName ?? u.email ?? 'משתמש',
                email: u.email ?? '',
                photoUrl: u.photoURL ?? undefined,
              }
            : null,
        )
        setLoading(false)
      }),
    [],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: signInWithGoogle,
      signOut: async () => {
        // forget the Google account too, so the next sign-in offers the account picker
        await GoogleSignin.signOut().catch(() => null)
        await firebaseSignOut(getAuth())
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
