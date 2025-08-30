"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Page() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/chat?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Bienvenue sur Valet</CardTitle>
          <CardDescription>
            Dites bonjour et expliquez ce que vous recherchez. Valet trouve le meilleur pour vous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: iPhone 15 Pro titane"
            />
            <Button type="submit">Rechercher</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


