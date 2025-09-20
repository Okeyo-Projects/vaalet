"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getApiBase } from "@/lib/api"

export type AuthUser = {
  id: number
  email: string
  name: string | null
  createdAt: string
}

export type AuthResult =
  | { success: true }
  | { success: false; error: string }

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (input: { email: string; password: string }) => Promise<AuthResult>
  register: (input: { email: string; password: string; name?: string }) => Promise<AuthResult>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.error === "string" && data.error.length > 0) {
      return data.error
    }
    if (data?.issues?.fieldErrors) {
      const fieldErrors = data.issues.fieldErrors as Record<string, string[]>
      const messages = Object.values(fieldErrors)
        .flat()
        .filter(Boolean)
      if (messages.length > 0) return messages[0]
    }
  } catch (error) {
    console.error("Failed to parse error response", error)
  }
  return `HTTP ${res.status}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async (withLoading = false) => {
    if (withLoading) {
      setIsLoading(true)
    }

    try {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/me`, {
        credentials: "include",
      })

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = (await res.json()) as { user: AuthUser }
      setUser(data.user)
    } catch (error) {
      console.error("Failed to refresh session", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(true)
  }, [refresh])

  const login = useCallback<AuthContextValue["login"]>(async ({ email, password }) => {
    try {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        return { success: false, error: await parseError(res) }
      }

      const data = (await res.json()) as { user: AuthUser }
      setUser(data.user)
      return { success: true }
    } catch (error) {
      console.error("Login failed", error)
      return { success: false, error: "Impossible de se connecter. Veuillez réessayer." }
    }
  }, [])

  const register = useCallback<AuthContextValue["register"]>(async ({ email, password, name }) => {
    try {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      if (!res.ok) {
        return { success: false, error: await parseError(res) }
      }

      const data = (await res.json()) as { user: AuthUser }
      setUser(data.user)
      return { success: true }
    } catch (error) {
      console.error("Registration failed", error)
      return { success: false, error: "Impossible de créer le compte. Veuillez réessayer." }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const base = getApiBase()
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Logout failed", error)
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    refresh: () => refresh(false),
  }), [user, isLoading, login, register, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
