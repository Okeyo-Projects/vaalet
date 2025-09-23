"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react"
import { useQuery } from "@tanstack/react-query"

import { getApiBase } from "@/lib/api"

import { useAuth } from "./auth-context"

export type JobStatus = "created" | "validating" | "searching" | "processing" | "completed" | "failed"

export type SearchHistoryJob = {
  id: string
  query: string
  country: string
  status: JobStatus
  message: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  result?: unknown
  error?: string
}

export type SearchHistoryContextValue = {
  jobs: SearchHistoryJob[]
  isLoading: boolean
  refresh: () => Promise<void>
}

const SearchHistoryContext = createContext<SearchHistoryContextValue | undefined>(undefined)

async function fetchHistory(): Promise<SearchHistoryJob[]> {
  const base = getApiBase()
  const res = await fetch(`${base}/jobs?limit=50`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return []
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const data = (await res.json()) as { jobs?: SearchHistoryJob[] }
  return Array.isArray(data.jobs) ? data.jobs : []
}

export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const {
    data = [],
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["search-history", user?.id ?? "guest"] as const,
    queryFn: fetchHistory,
    enabled: Boolean(user),
    refetchOnWindowFocus: false,
  })

  const refresh = useCallback(async () => {
    if (!user) return
    await refetch()
  }, [user, refetch])

  const value = useMemo<SearchHistoryContextValue>(
    () => ({
      jobs: user ? data : [],
      isLoading: Boolean(user) && (isPending || isFetching),
      refresh,
    }),
    [user, data, isPending, isFetching, refresh]
  )

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  )
}

export function useSearchHistory(): SearchHistoryContextValue {
  const ctx = useContext(SearchHistoryContext)
  if (!ctx) {
    throw new Error("useSearchHistory must be used within a SearchHistoryProvider")
  }
  return ctx
}
