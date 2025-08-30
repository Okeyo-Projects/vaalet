export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export type SearchPrefs = {
  scope: 'local' | 'international'
  locale: string
}


