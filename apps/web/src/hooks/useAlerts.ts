"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getApiBase } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export type AlertObjectiveType = "price_below" | "price_range" | "price_drop_percent"

export type Alert = {
  id: number
  jobId: string | null
  query: string
  country: string
  objectiveType: AlertObjectiveType
  targetPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  dropPercent: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateAlertInput = {
  jobId?: string
  query: string
  country: string
  objective:
    | { type: "price_below"; targetPrice: number }
    | { type: "price_range"; minPrice: number; maxPrice: number }
    | { type: "price_drop_percent"; dropPercent: number }
}

const ALERTS_QUERY_KEY = ["alerts"] as const

async function fetchAlerts(): Promise<Alert[]> {
  const base = getApiBase()
  const res = await fetch(`${base}/alerts`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return []
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const data = (await res.json()) as { alerts?: Alert[] }
  return Array.isArray(data.alerts) ? data.alerts : []
}

export function useAlerts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: fetchAlerts,
    enabled: Boolean(user),
  })
}

export function useCreateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const base = getApiBase()
      const res = await fetch(`${base}/alerts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const message = data?.error || `HTTP ${res.status}`
        throw new Error(message)
      }

      const payload = (await res.json()) as { alert: Alert }
      queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY })
      return payload.alert
    },
  })
}
