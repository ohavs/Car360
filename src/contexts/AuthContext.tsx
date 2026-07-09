import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService } from '../data'
import type { UserProfile } from '../types'

interface AuthCtx {
  user: UserProfile | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  isCloud: boolean
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isCloud: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return authService.onChange((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        isCloud: authService.isCloud,
        signIn: async () => {
          const u = await authService.signInWithGoogle()
          setUser(u)
        },
        signOut: async () => {
          await authService.signOut()
          setUser(null)
        },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
