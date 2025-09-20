"use client"

import { useState, FormEvent, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getApiBase } from "@/lib/api"
import { useSearchHistory } from "@/contexts/search-history-context"
import { Loader2, Send, ImagePlus, Mic } from "lucide-react"
import { toast } from "sonner"

export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh: refreshHistory } = useSearchHistory()
  const [query, setQuery] = useState("")
  const [country, setCountry] = useState("fr")
  const [isLoading, setIsLoading] = useState(false)

  // Initialize query from URL parameter
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
    }
  }, [searchParams])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    
    setIsLoading(true)
    
    try {
      const base = getApiBase()
      const res = await fetch(`${base}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q, country })
      })
      
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.message || `HTTP ${res.status}`)
      }
      
      const { id } = await res.json()
      void refreshHistory()
      router.push(`/chat/${id}`)
      
    } catch (error) {
      console.error('Job creation failed:', error)
      toast.error('Erreur lors de la création de la recherche', {
        description: error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const popularTags = [
    // Tech
    { label: "iPhone 15", query: "iPhone 15" },
    { label: "MacBook", query: "MacBook Pro" },
    { label: "AirPods", query: "AirPods Pro" },
    { label: "Samsung TV", query: "Samsung Smart TV" },
    
    // Vêtements
    { label: "T-shirt", query: "t-shirt coton" },
    { label: "Jean", query: "jean slim homme femme" },
    { label: "Sneakers", query: "baskets Nike Adidas" },
    { label: "Robe", query: "robe été femme" },
    
    // Alimentation
    { label: "Café bio", query: "café bio grains" },
    { label: "Chocolat", query: "chocolat noir bio" },
    { label: "Miel", query: "miel naturel" },
    { label: "Thé vert", query: "thé vert bio" }
  ]

  const handleQuickAction = (actionQuery: string) => {
    setQuery(actionQuery)
  }

  const getCurrentTime = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bonjour"
    if (hour < 18) return "Bon après-midi" 
    return "Bonsoir"
  }

  return (
    <div className="min-h-screen bg-gradient-modern pt-20">
      <div className="container-modern py-8 px-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <h1 className="text-2xl font-medium text-gray-600 dark:text-gray-300 mb-2">
              {getCurrentTime()} 👋
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Comment puis-je vous aider à
              <br />
              <span className="text-gradient-primary">
                trouver les meilleurs produits
              </span>
              <span className="text-gray-900 dark:text-white"> aujourd&apos;hui ?</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Utilisez une des suggestions ci-dessous ou tapez votre recherche pour commencer.
            </p>
          </div>
        </div>

        {/* Popular Tags */}
        <div className="text-center mb-10">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-6">Recherches populaires</h3>
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-2">
              {popularTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(tag.query)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-white rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-gray-600"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input - ChatGPT Style */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <form onSubmit={onSubmit}>
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                <div className="flex items-center">
                  {/* Left Actions */}
                  <div className="flex items-center gap-2 px-4">
                    {/* Upload Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      onClick={() => toast.info("Fonctionnalité d'upload d'image bientôt disponible")}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    
                    {/* Voice Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      onClick={() => toast.info("Recherche vocale bientôt disponible")}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Search Input */}
                  <div className="flex-1">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Que voulez-vous acheter aujourd&apos;hui ?"
                      disabled={isLoading}
                      className="border-0 bg-transparent text-base placeholder:text-gray-500 focus:ring-0 focus:outline-none h-14 px-2 rounded-2xl"
                    />
                  </div>
                  
                  {/* Right Actions */}
                  <div className="flex items-center gap-3 px-4">
                    {/* Country Selector */}
                    <Select value={country} onValueChange={setCountry} disabled={isLoading}>
                      <SelectTrigger className="w-auto min-w-[80px] border-0 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-xl h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">🇫🇷 France</SelectItem>
                        <SelectItem value="sa">🇸🇦 Arabie Saoudite</SelectItem>
                        <SelectItem value="ae">🇦🇪 Émirats Arabes Unis</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Send Button */}
                    <Button 
                      type="submit" 
                      disabled={!query.trim() || isLoading}
                      size="sm"
                      className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <Send className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          
          {/* Subtle Helper Text */}
          <p className="text-center text-sm text-gray-400 mt-4">
            Okeyo Ai peut vous aider à trouver les meilleurs produits aux meilleurs prix
          </p>
        </div>
        

      </div>
    </div>
  )
}
