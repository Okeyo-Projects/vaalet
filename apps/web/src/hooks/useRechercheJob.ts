"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

export function useRechercheJob() {
  const [state, setState] = useState<RechercheState>({ status: "idle", products: [] })
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  useEffect(() => cancel, [cancel])

  const search = useCallback(async (q: string, country = 'us') => {
    try {
      // Cancel any ongoing request
      cancel()
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()
      
      setState({ status: "searching", products: [], message: "Recherche en cours…" })
      
      const base = getApiBase()
      const res = await fetch(`${base}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, country }),
        signal: abortControllerRef.current.signal
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const errorMessage = errorData?.message || `HTTP ${res.status}`
        throw new Error(errorMessage)
      }

      const data = await res.json()
      
      setState({ 
        status: 'done', 
        products: data.products || [], 
        message: `Trouvé ${data.products?.length || 0} produits sur ${data.totalFound || 0} résultats`
      })

    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError') return
      
      setState({ 
        status: 'error', 
        products: [], 
        message: 'Erreur lors de la recherche',
        error: error.message || 'Une erreur inconnue s\'est produite'
      })
    } finally {
      abortControllerRef.current = null
    }
  }, [cancel])

  return { state, search, cancel }
}


