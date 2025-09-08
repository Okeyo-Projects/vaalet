"use client"

import { useEffect, useRef, useState, type FormEventHandler } from "react"
import { useSearchParams } from "next/navigation"
import { AIConversation, AIConversationContent, AIConversationScrollButton } from "@/components/ai/conversation"
import { AIBranch, AIBranchMessages } from "@/components/ai/branch"
import { AIInput, AIInputSubmit, AIInputTextarea, AIInputToolbar, AIInputTools } from "@/components/ai/input"
import { useRechercheJob } from "@/hooks/useRechercheJob"
import { ProductCard } from "@/components/ProductCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Page() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState<string>(initialQuery)
  const [country, setCountry] = useState<string>("us")

  const { state, search } = useRechercheJob()
  const [progress, setProgress] = useState<string>("")

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!text) return
    setProgress('')
    search(text, country).catch(() => setProgress('Erreur lors de la recherche.'))
  }

  useEffect(() => {
    const el = scrollRef.current
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight
      bottomRef.current?.scrollIntoView({ block: "end" })
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight
      bottomRef.current?.scrollIntoView({ block: "end" })
    })
  }, [state.status])


  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 relative flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto divide-y pb-40">
          <AIConversation>
            <AIConversationContent>
              <AIBranch defaultBranch={0}>
                <AIBranchMessages>
                  <>
                    {(state.message || progress) && (
                      <div className={`px-4 py-2 text-sm ${
                        state.status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {state.message || progress}
                      </div>
                    )}
                    {state.error && (
                      <div className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-md mx-4">
                        <strong>Erreur:</strong> {state.error}
                      </div>
                    )}
                  </>
                </AIBranchMessages>
              </AIBranch>
            </AIConversationContent>
            <AIConversationScrollButton />
          </AIConversation>
          {/* Products grid */}
          {state.products.length > 0 && (
            <div className="px-4 py-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.products.map((p) => (
                <ProductCard key={p.id} id={p.id} name={p.name} price={p.price} currency={p.currency} url={p.url} imageUrl={p.imageUrl} snippet={p.snippet} />
              ))}
            </div>
          )}
        </div>
        {/* <div className="shrink-0 fixed bottom-24 inset-x-4 md:left-[calc(var(--sidebar-width)+16px)] md:right-4 z-40">
          <AISuggestions className="px-4 pb-3 pt-4">
            {suggestions.map((s) => (
              <AISuggestion key={s} onClick={() => handleSuggestionClick(s)} suggestion={s} />
            ))}
          </AISuggestions>
        </div> */}
        <div className="fixed bottom-4 inset-x-4 md:left-[calc(var(--sidebar-width)+16px)] md:right-4 z-50">
          <div className="mx-auto w-full">
            <AIInput onSubmit={handleSubmit}>
              <AIInputTextarea value={text} onChange={(e) => setText(e.target.value)} />
              <AIInputToolbar>
                <AIInputTools>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">🇺🇸 États-Unis</SelectItem>
                      <SelectItem value="fr">🇫🇷 France</SelectItem>
                      <SelectItem value="de">🇩🇪 Allemagne</SelectItem>
                      <SelectItem value="gb">🇬🇧 Royaume-Uni</SelectItem>
                      <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                      <SelectItem value="au">🇦🇺 Australie</SelectItem>
                      <SelectItem value="es">🇪🇸 Espagne</SelectItem>
                      <SelectItem value="it">🇮🇹 Italie</SelectItem>
                      <SelectItem value="ma">🇲🇦 Maroc (Non supporté)</SelectItem>
                    </SelectContent>
                  </Select>
                </AIInputTools>
                <AIInputSubmit disabled={!text} status={state.status === 'searching' ? 'streaming' : 'ready'} />
              </AIInputToolbar>
            </AIInput>
          </div>
        </div>
      </div>
      <div ref={bottomRef} />
    </div>
  )
}


