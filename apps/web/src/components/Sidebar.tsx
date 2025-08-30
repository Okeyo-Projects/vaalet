"use client"
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function Sidebar() {
  const [items, setItems] = useState<Array<{ id: string; title: string }>>([
    { id: 'new', title: 'Nouvelle recherche' },
  ])

  return (
    <aside className="h-screen w-[280px] border-r sticky top-0 hidden md:flex flex-col bg-background">
      <div className="p-3">
        <Button className="w-full" variant="default">Nouvelle recherche</Button>
      </div>
      <Separator />
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {items.map((it) => (
          <button key={it.id} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted">
            {it.title}
          </button>
        ))}
      </div>
      <Separator />
      <div className="p-3 text-xs opacity-60">Valet © {new Date().getFullYear()}</div>
    </aside>
  )
}


