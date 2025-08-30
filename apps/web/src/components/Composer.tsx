"use client"
import { useEffect, useRef, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SearchPrefs } from "@/types/chat"

export function Composer({ onSubmit }: { onSubmit: (query: string, prefs: SearchPrefs) => void }) {
  const [value, setValue] = useState("")
  const [prefs, setPrefs] = useState<SearchPrefs>({ scope: 'local', locale: typeof navigator !== 'undefined' ? navigator.language : 'fr-FR' })
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>("#valet-input")?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit() {
    const q = value.trim()
    if (!q) return
    onSubmit(q, prefs)
    setValue("")
  }

  return (
    <form
      ref={ref}
      className="fixed bottom-4 left-[300px] right-4 z-50 flex items-center gap-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-xl p-2 shadow-sm"
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <Select value={prefs.scope} onValueChange={(v) => setPrefs((p) => ({ ...p, scope: v as SearchPrefs['scope'] }))}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Portée" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="local">Local</SelectItem>
          <SelectItem value="international">International</SelectItem>
        </SelectContent>
      </Select>
      <Input id="valet-input" placeholder="Posez votre question ou collez un produit…" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
      <Button type="submit">Envoyer</Button>
    </form>
  )
}


