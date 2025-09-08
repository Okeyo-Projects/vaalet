"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Info } from "lucide-react"

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q")

  useEffect(() => {
    // If there's a query parameter, automatically redirect to create a job
    if (query) {
      // This is a legacy URL, redirect to home with the query pre-filled
      router.replace(`/?q=${encodeURIComponent(query)}`)
    }
  }, [query, router])

  return (
    <div className="min-h-screen bg-gradient-modern flex items-center justify-center">
      <Card className="glass-card w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
            <Info className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Page modernisée</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Cette page utilise maintenant un <span className="text-gradient-primary font-medium">nouveau système</span> de recherche avec suivi en temps réel.
            </p>
          </div>
          <Button onClick={() => router.push('/')} className="btn-gradient">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Aller à la recherche
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


