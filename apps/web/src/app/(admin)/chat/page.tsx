"use client"

import { useEffect, useRef, useState, type FormEventHandler } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AIConversation, AIConversationContent, AIConversationScrollButton } from "@/components/ai/conversation"
import { AIBranch, AIBranchMessages } from "@/components/ai/branch"
import { AIInput, AIInputSubmit, AIInputTextarea, AIInputToolbar, AIInputTools } from "@/components/ai/input"
import Image from "next/image"
import { useRechercheJob } from "@/hooks/useRechercheJob"
import { ProductCard } from "@/components/ProductCard"



type RechercheProduct = {
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

export default function Page() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState<string>(initialQuery)
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready")

  const { state, search, cancel } = useRechercheJob()
  const [progress, setProgress] = useState<string>("")

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!text) return
    setProgress('Création de la recherche…')
    search(text).catch(() => setProgress('Erreur lors de la création de la recherche.'))
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
  }, [status])

  const handleSuggestionClick = (s: string) => {
    toast.success("Suggestion clicked", { description: s })
    setText(s)
    setStatus("submitted")
    setTimeout(() => setStatus("streaming"), 200)
    setTimeout(() => setStatus("ready"), 2000)
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 relative flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto divide-y pb-40">
          <AIConversation>
            <AIConversationContent>
              <AIBranch defaultBranch={0}>
                <AIBranchMessages>
                  <>
                    {state.message || progress ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">{state.message || progress}</div>
                    ) : (
                      <div className="hidden" />
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
                  {/* <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AIInputButton>
                        <PlusIcon size={16} />
                        <span className="sr-only">Add attachment</span>
                      </AIInputButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>
                        <FileIcon className="mr-2" size={16} />
                        Upload file
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ImageIcon className="mr-2" size={16} />
                        Upload photo
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ScreenShareIcon className="mr-2" size={16} />
                        Take screenshot
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CameraIcon className="mr-2" size={16} />
                        Take photo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AIInputButton variant="ghost">
                    <MicIcon size={16} />
                    <span className="sr-only">Microphone</span>
                  </AIInputButton> */}
                  {/* <AIInputButton variant="ghost">
                    <GlobeIcon size={16} />
                    <span>Search</span>
                  </AIInputButton>
                  <AIInputModelSelect value={model} onValueChange={setModel}>
                    <AIInputModelSelectTrigger>
                      <AIInputModelSelectValue />
                    </AIInputModelSelectTrigger>
                    <AIInputModelSelectContent>
                      {models.map((m) => (
                        <AIInputModelSelectItem key={m.id} value={m.id}>
                          {m.name}
                        </AIInputModelSelectItem>
                      ))}
                    </AIInputModelSelectContent>
                  </AIInputModelSelect> */}
                </AIInputTools>
                <AIInputSubmit disabled={!text} status={status} />
              </AIInputToolbar>
            </AIInput>
          </div>
        </div>
      </div>
      <div ref={bottomRef} />
    </div>
  )
}


