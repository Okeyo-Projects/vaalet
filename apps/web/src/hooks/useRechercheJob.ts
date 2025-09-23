"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useMutation } from "@tanstack/react-query"

import { getApiBase } from "@/lib/api"

export type RechercheProduct = {
  id: string
  name: string
  price: number
  currency: string
  url: string
  source?: string
  imageUrl?: string
  videoUrl?: string
  snippet?: string
}

export type RechercheState = {
  status: "idle" | "searching" | "done" | "error"
  message?: string
  products: RechercheProduct[]
  error?: string
}

type RechercheVariables = {
  query: string
  country: string
  controller: AbortController
}

type RechercheResponse = {
  products?: RechercheProduct[]
  totalFound?: number
}

export function useRechercheJob() {
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  useEffect(() => cancel, [cancel])

  const mutation = useMutation<RechercheResponse, Error, RechercheVariables>({
    mutationFn: async ({ query, country, controller }) => {
      const base = getApiBase()
      const res = await fetch(`${base}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, country }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const message = errorData?.message || `HTTP ${res.status}`
        throw new Error(message)
      }

      return (await res.json()) as RechercheResponse
    },
    onSettled: () => {
      abortControllerRef.current = null
    },
  })

  const search = useCallback(
    async (q: string, country = "us") => {
      cancel()
      const controller = new AbortController()
      abortControllerRef.current = controller
      try {
        await mutation.mutateAsync({ query: q, country, controller })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
        console.error("Recherche failed", error)
      }
    },
    [cancel, mutation]
  )

  const state: RechercheState = useMemo(() => {
    if (mutation.isPending) {
      return {
        status: "searching",
        products: [],
        message: "Recherche en cours…",
      }
    }

    if (mutation.isError) {
      return {
        status: "error",
        products: [],
        message: "Erreur lors de la recherche",
        error: mutation.error.message,
      }
    }

    if (mutation.isSuccess) {
      const products = mutation.data.products ?? []
      const totalFound = mutation.data.totalFound ?? products.length
      return {
        status: "done",
        products,
        message: `Trouvé ${products.length} produits sur ${totalFound} résultats`,
      }
    }

    return { status: "idle", products: [] }
  }, [mutation.isPending, mutation.isError, mutation.isSuccess, mutation.data, mutation.error])

  return { state, search, cancel }
}
