"use client"
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select"

export type BundledLanguage =
  | 'ts' | 'tsx' | 'js' | 'jsx'
  | 'json'
  | 'bash' | 'shell' | 'sh'
  | 'python' | 'py'
  | 'go'
  | 'rust' | 'rs'
  | 'sql'
  | 'html' | 'css'
  | 'markdown' | 'md'
  | 'yaml' | 'yml'

type CodeItem = {
  language: string
  filename: string
  code: string
}

export type CodeBlockProps = {
  data: CodeItem[]
  defaultValue?: string
  className?: string
  children?: React.ReactNode
}

type Ctx = {
  items: CodeItem[]
  value: string
  setValue: (v: string) => void
}

const CodeBlockCtx = createContext<Ctx | null>(null)
function useCodeBlock() {
  const ctx = useContext(CodeBlockCtx)
  if (!ctx) throw new Error('CodeBlock.* must be used within <CodeBlock>')
  return ctx
}

export function CodeBlock({ data, defaultValue, className, children }: CodeBlockProps) {
  const initial = defaultValue ?? data[0]?.language ?? ''
  const [value, setValue] = useState(initial)
  const ctx = useMemo<Ctx>(() => ({ items: data, value, setValue }), [data, value])
  return (
    <CodeBlockCtx.Provider value={ctx}>
      <div className={"rounded-lg border overflow-hidden " + (className ?? '')}>
        {children}
      </div>
    </CodeBlockCtx.Provider>
  )
}

export function CodeBlockHeader({ children }: { children?: React.ReactNode }) {
  return <div className="flex items-center gap-2 border-b bg-background/60 px-3 py-2">{children}</div>
}

export function CodeBlockFiles({ children }: { children: (item: CodeItem) => React.ReactNode }) {
  const { items } = useCodeBlock()
  return <div className="flex items-center gap-1">{items.map((it) => children(it))}</div>
}

export function CodeBlockItem({ children, value }: { children: React.ReactNode; value: string }) {
  const { value: active } = useCodeBlock()
  const isActive = active === value
  return (
    <div className={"text-xs px-2 py-1 " + (isActive ? 'bg-muted font-medium rounded-md' : 'opacity-90')}>{children}</div>
  )
}

export function CodeBlockFilename({ children, value }: { children?: React.ReactNode; value: string }) {
  const { value: active } = useCodeBlock()
  const isActive = active === value
  return <div className={"text-xs px-2 py-1 rounded-md " + (isActive ? 'bg-muted font-medium' : 'opacity-70')}>{children}</div>
}

export function CodeBlockBody({ children }: { children: (item: CodeItem) => React.ReactNode }) {
  const { items, value } = useCodeBlock()
  const current = items.find((i) => i.language === value) ?? items[0]
  return <div className="p-3 bg-background">{children(current)}</div>
}

export function CodeBlockContent({ children, language }: { children: string; language?: BundledLanguage }) {
  return (
    <pre className="overflow-x-auto text-sm leading-6">
      <code>
        {children}
      </code>
    </pre>
  )
}

export function CodeBlockCopyButton({ onCopy, onError }: { onCopy?: () => void; onError?: () => void }) {
  const { items, value } = useCodeBlock()
  const current = items.find((i) => i.language === value) ?? items[0]
  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(current.code)
      onCopy?.()
    } catch {
      onError?.()
    }
  }, [current.code, onCopy, onError])
  return (
    <Button type="button" size="sm" variant="outline" onClick={handle}>
      Copier
    </Button>
  )
}

export function CodeBlockSelect({ children }: { children: React.ReactNode }) {
  const { value, setValue } = useCodeBlock()
  return <Select value={value} onValueChange={setValue}>{children}</Select>
}
export function CodeBlockSelectTrigger({ children }: { children: React.ReactNode }) {
  return <UISelectTrigger className="h-7 px-2 py-0 text-xs">{children}</UISelectTrigger>
}
export function CodeBlockSelectValue() {
  return <UISelectValue />
}
export function CodeBlockSelectContent({ children }: { children: (item: CodeItem) => React.ReactNode }) {
  const { items } = useCodeBlock()
  return <UISelectContent>{items.map((it) => children(it))}</UISelectContent>
}
export function CodeBlockSelectItem({ children, value }: { children: React.ReactNode; value: string }) {
  return <UISelectItem value={value}>{children}</UISelectItem>
}


