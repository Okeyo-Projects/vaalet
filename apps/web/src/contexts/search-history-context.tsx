"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

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

export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [jobs, setJobs] = useState<SearchHistoryJob[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setJobs([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const base = getApiBase()
      const res = await fetch(`${base}/jobs?limit=50`, {
        credentials: "include",
      })

      if (res.status === 401) {
        setJobs([])
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = (await res.json()) as { jobs?: SearchHistoryJob[] }
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
    } catch (error) {
      console.error("Failed to load search history", error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh])

  const value = useMemo<SearchHistoryContextValue>(
    () => ({ jobs, isLoading, refresh }),
    [jobs, isLoading, refresh]
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
