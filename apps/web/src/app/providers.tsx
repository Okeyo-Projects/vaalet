"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"

import { AuthProvider } from "@/contexts/auth-context"
import { SearchHistoryProvider } from "@/contexts/search-history-context"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchHistoryProvider>{children}</SearchHistoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
