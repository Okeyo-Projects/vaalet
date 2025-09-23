"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getApiBase } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export type Favorite = {
  id: number
  productId: string
  name: string
  price: number | null
  currency: string
  url: string
  imageUrl: string | null
  snippet: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

export type CreateFavoriteInput = {
  productId: string
  name: string
  price?: number
  currency: string
  url: string
  imageUrl?: string | null
  snippet?: string | null
  source?: string | null
}

const FAVORITES_QUERY_KEY = ["favorites"] as const

async function fetchFavorites(): Promise<Favorite[]> {
  const base = getApiBase()
  const res = await fetch(`${base}/favorites`, {
    credentials: "include",
  })

  if (res.status === 401) {
    return []
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const data = (await res.json()) as { favorites?: Favorite[] }
  return Array.isArray(data.favorites) ? data.favorites : []
}

export function useFavorites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: fetchFavorites,
    enabled: Boolean(user),
  })
}

export function useCreateFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateFavoriteInput) => {
      const base = getApiBase()
      const res = await fetch(`${base}/favorites`, {
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

      const payload = (await res.json()) as { favorite: Favorite }
      queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY })
      return payload.favorite
    },
  })
}
