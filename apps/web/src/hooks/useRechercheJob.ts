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
  status: "idle" | "queued" | "analyzing" | "deepsearch" | "compiling" | "done" | "error"
  message?: string
  products: RechercheProduct[]
  jobId?: string
}

export function useRechercheJob() {
  const [state, setState] = useState<RechercheState>({ status: "idle", products: [] })
  const pollRef = useRef<number | null>(null)

  const cancel = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => cancel, [cancel])

  const search = useCallback(async (q: string) => {
    cancel()
    setState({ status: "queued", products: [], message: "Création de la recherche…" })
    const base = getApiBase()
    const res = await fetch(`${base}/recherche`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const id = body.id as string
    setState((s) => ({ ...s, jobId: id, status: "analyzing", message: "Analyse de la requête…" }))
    pollRef.current = window.setInterval(async () => {
      const r = await fetch(`${base}/recherche/${id}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setState((s) => ({ ...s, status: data.status, message: data.message }))
      if (data.status === 'done' && data.result) {
        setState({ status: 'done', products: data.result.products || [], jobId: id, message: 'Terminé' })
        cancel()
      }
      if (data.status === 'error') {
        setState((s) => ({ ...s, status: 'error', message: 'Erreur lors de la recherche.' }))
        cancel()
      }
    }, 1500)
  }, [cancel])

  return { state, search, cancel }
}


