"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

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

const AUTH_QUERY_KEY = ["auth", "me"] as const

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

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const base = getApiBase()
  const res = await fetch(`${base}/auth/me`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return null
  }

  if (!res.ok) {
    throw new Error(await parseError(res))
  }

  const data = (await res.json()) as { user: AuthUser }
  return data.user
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const {
    data: user = null,
    isPending,
    refetch,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        throw new Error(await parseError(res))
      }

      const data = (await res.json()) as { user: AuthUser }
      return data.user
    },
    onSuccess: (nextUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, nextUser)
      queryClient.invalidateQueries({ queryKey: ["search-history"], exact: false })
    },
  })

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      if (!res.ok) {
        throw new Error(await parseError(res))
      }

      const data = (await res.json()) as { user: AuthUser }
      return data.user
    },
    onSuccess: (nextUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, nextUser)
      queryClient.invalidateQueries({ queryKey: ["search-history"], exact: false })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const base = getApiBase()
      const res = await fetch(`${base}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error(await parseError(res))
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.removeQueries({ queryKey: ["search-history"], exact: false })
    },
  })

  const login = useCallback<AuthContextValue["login"]>(
    async (input) => {
      try {
        await loginMutation.mutateAsync(input)
        return { success: true }
      } catch (error) {
        console.error("Login failed", error)
        const message = error instanceof Error ? error.message : "Impossible de se connecter. Veuillez réessayer."
        return { success: false, error: message }
      }
    },
    [loginMutation]
  )

  const register = useCallback<AuthContextValue["register"]>(
    async (input) => {
      try {
        await registerMutation.mutateAsync(input)
        return { success: true }
      } catch (error) {
        console.error("Registration failed", error)
        const message = error instanceof Error ? error.message : "Impossible de créer le compte. Veuillez réessayer."
        return { success: false, error: message }
      }
    },
    [registerMutation]
  )

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      console.error("Logout failed", error)
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
    }
  }, [logoutMutation, queryClient])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: isPending,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isPending, login, register, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
