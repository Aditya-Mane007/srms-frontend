import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api, must, refresh, setAccessToken, setOnSignedOut, type Schemas } from "@/api/client"

type Auth =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; me: Schemas["Me"] }

const Ctx = createContext<{
  auth: Auth
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>({ status: "loading" })
  const qc = useQueryClient()

  const loadMe = useCallback(async () => {
    const me = await must(api.GET("/me"))
    setAuth({ status: "in", me })
  }, [])

  const signOut = useCallback(() => {
    setAccessToken(null)
    qc.clear()
    setAuth({ status: "out" })
  }, [qc])

  useEffect(() => {
    setOnSignedOut(signOut)
    // restore the session from the httpOnly refresh cookie
    refresh().then((ok) => (ok ? loadMe().catch(signOut) : signOut()))
  }, [loadMe, signOut])

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await must(api.POST("/auth/login", { body: { email, password } }))
      setAccessToken(accessToken)
      await loadMe()
    },
    [loadMe],
  )

  const logout = useCallback(async () => {
    await api.POST("/auth/logout").catch(() => {})
    signOut()
  }, [signOut])

  return <Ctx.Provider value={{ auth, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useAuth outside AuthProvider")
  return v
}
