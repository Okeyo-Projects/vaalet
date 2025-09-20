"use client"
import { useState } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"

type Message = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Bonjour, je suis votre Okeyo Ai. Je suis à votre entière disposition. Dites-moi ce que vous cherchez.",
    },
  ])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <ScrollArea className="h-[calc(100vh-200px)] w-full rounded-2xl p-4 mb-4">
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'assistant' ? 'text-left' : 'text-right'}>
              <div className={
                m.role === 'assistant'
                  ? 'inline-block px-4 py-2 rounded-2xl bg-muted'
                  : 'inline-block px-4 py-2 rounded-2xl bg-primary text-primary-foreground'
              }>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}


