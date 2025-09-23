"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProductCard } from "@/components/ProductCard"
import { getApiBase } from "@/lib/api"
import { useSearchHistory } from "@/contexts/search-history-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Loader2, Bot, User, Sparkles, Bell, X, Eye, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useCreateAlert } from "@/hooks/useAlerts"
import type { AlertObjectiveType, CreateAlertInput } from "@/hooks/useAlerts"
import { useCreateFavorite } from "@/hooks/useFavorites"

type JobStatus = 'created' | 'validating' | 'searching' | 'processing' | 'completed' | 'failed'

type SearchJob = {
  id: string
  query: string
  country: string
  status: JobStatus
  message: string
  result?: {
    query: string
    products: Array<{
      id: string
      name: string
      price: number
      currency: string
      url: string
      source?: string
      imageUrl?: string
      snippet?: string
    }>
    totalFound: number
  }
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

type TrackableProduct = {
  id: string
  name: string
  price: number
  currency: string
  url: string
  imageUrl?: string
  snippet?: string
  source?: string
}

const STATUS_MESSAGES = {
  created: "J'ai reçu votre demande ! Je commence la recherche...",
  validating: "Je valide les paramètres de recherche...",
  searching: "Je recherche les meilleurs produits pour vous...",
  processing: "J'analyse et sélectionne les produits les plus pertinents...",
  completed: "Parfait ! J'ai trouvé d'excellents produits pour vous :",
  failed: "Désolé, je n'ai pas pu effectuer cette recherche."
}

const STATUS_ICONS = {
  created: <Clock className="w-4 h-4" />,
  validating: <Loader2 className="w-4 h-4 animate-spin" />,
  searching: <Loader2 className="w-4 h-4 animate-spin" />,
  processing: <Sparkles className="w-4 h-4 animate-pulse" />,
  completed: <CheckCircle className="w-4 h-4 text-green-600" />,
  failed: <AlertCircle className="w-4 h-4 text-red-600" />
}

export default function Page() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [trackerModal, setTrackerModal] = useState<{ isOpen: boolean; product: TrackableProduct } | null>(null)
  const [alertType, setAlertType] = useState<AlertObjectiveType>('price_below')
  const [targetPrice, setTargetPrice] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [dropPercent, setDropPercent] = useState('10')
  const [alertError, setAlertError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastStatusRef = useRef<JobStatus | null>(null)
  const { refresh: refreshHistory } = useSearchHistory()
  const createAlert = useCreateAlert()
  const createFavorite = useCreateFavorite()

  type HttpError = Error & { status?: number }

  const jobQuery = useQuery<SearchJob, HttpError>({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const base = getApiBase()
      const res = await fetch(`${base}/jobs/${jobId}`, {
        credentials: "include",
      })

      if (res.status === 401) {
        const error = new Error("Unauthorized") as HttpError
        error.status = 401
        throw error
      }

      if (res.status === 404) {
        const error = new Error("Recherche introuvable") as HttpError
        error.status = 404
        throw error
      }

      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`) as HttpError
        error.status = res.status
        throw error
      }

      return (await res.json()) as SearchJob
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 1500
      return data.status === "completed" || data.status === "failed" ? false : 1500
    },
  })

  const job = jobQuery.data ?? null
  const error = jobQuery.error
  const isLoading = jobQuery.isPending

  const handleOpenAlertModal = () => {
    setAlertType('price_below')
    setAlertError(null)
    setDropPercent('10')
    setIsAlertModalOpen(true)
  }

const closeAlertModal = () => {
  setIsAlertModalOpen(false)
  setAlertError(null)
}

  useEffect(() => {
    if (!isAlertModalOpen || !job?.result?.products?.length) return
    const first = job.result.products[0]
    setTargetPrice(first.price.toString())
    const minSuggestion = Math.max(0, first.price * 0.9)
    const maxSuggestion = first.price * 1.05
    setMinPrice(minSuggestion.toFixed(2))
    setMaxPrice(maxSuggestion.toFixed(2))
    setAlertError(null)
  }, [isAlertModalOpen, job])

  const parseNumeric = (value: string) => Number(value.replace(',', '.'))

  const handleCreateAlert = async () => {
    if (!job) return
    setAlertError(null)

    try {
      let objective: CreateAlertInput["objective"]

      if (alertType === 'price_below') {
        const value = parseNumeric(targetPrice)
        if (!Number.isFinite(value) || value <= 0) {
          setAlertError('Veuillez saisir un prix valide.')
          return
        }
        objective = { type: 'price_below', targetPrice: value }
      } else if (alertType === 'price_range') {
        const min = parseNumeric(minPrice)
        const max = parseNumeric(maxPrice)
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= 0) {
          setAlertError('Veuillez saisir une plage de prix valide.')
          return
        }
        if (max <= min) {
          setAlertError('Le prix maximum doit être supérieur au prix minimum.')
          return
        }
        objective = { type: 'price_range', minPrice: min, maxPrice: max }
      } else {
        const percent = parseNumeric(dropPercent)
        if (!Number.isFinite(percent) || percent <= 0) {
          setAlertError('Veuillez saisir un pourcentage valide.')
          return
        }
        objective = { type: 'price_drop_percent', dropPercent: percent }
      }

      await createAlert.mutateAsync({
        jobId: job.id,
        query: job.query,
        country: job.country,
        objective,
      })

      toast.success('Alerte créée', {
        description: 'Nous vous avertirons dès qu’une nouvelle offre correspond à vos objectifs.',
      })
      refreshHistory()
      closeAlertModal()
    } catch (err) {
      toast.error("Impossible de créer l'alerte", {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

const handleTrackerClick = (product: TrackableProduct) => {
  setTrackerModal({ isOpen: true, product })
}

const closeTrackerModal = () => {
  setTrackerModal(null)
}

  useEffect(() => {
    if (error?.status === 401) {
      router.replace('/login')
    }
  }, [error, router])

  useEffect(() => {
    if (!job) return
    if (job.status === 'completed' || job.status === 'failed') {
      if (lastStatusRef.current !== job.status) {
        lastStatusRef.current = job.status
        void refreshHistory()
      }
    }
  }, [job, refreshHistory])

  useEffect(() => {
    const el = scrollRef.current
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight
      bottomRef.current?.scrollIntoView({ block: "end" })
    })
  }, [job])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-modern flex items-center justify-center">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Chargement</h2>
              <p className="text-gray-600 dark:text-gray-300">Récupération de votre recherche...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if ((error && error.status !== 401) || (!job && !isLoading)) {
    const message = error?.status === 404 ? 'Recherche introuvable' : error?.message || 'Recherche introuvable'
    return (
      <div className="min-h-screen bg-gradient-modern flex items-center justify-center">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Erreur</h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </div>
            <Button onClick={() => router.push('/')} className="btn-gradient">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l&apos;accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!job) {
    return null
  }

  const isCompleted = job.status === 'completed'

  const handleCreateFavorite = async () => {
    if (!trackerModal) return

    try {
      const product = trackerModal.product
      await createFavorite.mutateAsync({
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        url: product.url,
        imageUrl: product.imageUrl,
        snippet: product.snippet,
        source: product.source,
      })

      toast.success('Produit suivi', {
        description: 'Le produit a été ajouté à vos favoris.',
      })
      closeTrackerModal()
    } catch (err) {
      toast.error('Impossible de suivre ce produit', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  return (
    <>
      {/* Search Alert Modal */}
      {isAlertModalOpen && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-xl">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                    <Bell className="h-3.5 w-3.5" />
                    <span>Notification intelligente</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Créer une alerte</h2>
                    <p className="text-sm text-muted-foreground">
                      Recherche : “{job.query}” · Pays : {job.country.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeAlertModal} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { type: 'price_below', label: 'Prix cible', description: 'Notifier sous un prix précis' },
                  { type: 'price_range', label: 'Plage de prix', description: 'Encadrer un budget' },
                  { type: 'price_drop_percent', label: 'Baisse %', description: 'Suivre une remise' },
                ].map((option) => (
                  <Button
                    key={option.type}
                    type="button"
                    variant={alertType === option.type ? 'default' : 'outline'}
                    className={`h-auto flex flex-col items-start gap-1 rounded-xl border-dashed py-3 ${alertType === option.type ? 'btn-gradient text-white shadow-lg' : ''}`}
                    onClick={() => setAlertType(option.type as AlertObjectiveType)}
                  >
                    <span className="text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className={`text-xs ${alertType === option.type ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {option.description}
                    </span>
                  </Button>
                ))}
              </div>

              {alertType === 'price_below' && (
                <div className="space-y-2">
                  <Label htmlFor="alert-target-price">Prix cible</Label>
                  <Input
                    id="alert-target-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetPrice}
                    onChange={(event) => setTargetPrice(event.target.value)}
                    placeholder="Ex: 1499"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous serez averti dès que le prix passera sous ce seuil.
                  </p>
                </div>
              )}

              {alertType === 'price_range' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="alert-min-price">Prix minimum</Label>
                    <Input
                      id="alert-min-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="Ex: 1200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-max-price">Prix maximum</Label>
                    <Input
                      id="alert-max-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="Ex: 1600"
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Nous vous notifierons uniquement pour les offres comprises dans cet intervalle.
                  </p>
                </div>
              )}

              {alertType === 'price_drop_percent' && (
                <div className="space-y-2">
                  <Label htmlFor="alert-drop-percent">Pourcentage de baisse</Label>
                  <Input
                    id="alert-drop-percent"
                    type="number"
                    min="1"
                    step="0.5"
                    value={dropPercent}
                    onChange={(event) => setDropPercent(event.target.value)}
                    placeholder="Ex: 15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recevez une alerte lorsqu’une remise au moins égale à ce pourcentage est détectée.
                  </p>
                </div>
              )}

              <div className="rounded-xl bg-orange-50/80 p-3 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-200">
                🚀 Valet surveille en continu {job.country.toUpperCase()} et plus de 50 boutiques pour cette recherche.
              </div>

              {alertError && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{alertError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateAlert}
                  disabled={createAlert.isPending}
                  className="flex-1 btn-gradient"
                >
                  {createAlert.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    "Créer l'alerte"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeAlertModal}
                  disabled={createAlert.isPending}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Tracker Modal */}
      {trackerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-md">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Suivi de produit
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {trackerModal.product.name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={closeTrackerModal} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-xl bg-blue-50/80 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                Prix actuel : <strong>{trackerModal.product.price.toLocaleString()} {trackerModal.product.currency.toUpperCase()}</strong><br />
                Source : {trackerModal.product.source ?? 'Inconnue'}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Suivi des prix</p>
                    <p>Alertes instantanées en cas de baisse ou de promotion exceptionnelle.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Disponibilité</p>
                    <p>Notifications dès que le produit revient en stock ou change de vendeur.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Analyse IA</p>
                    <p>Tendances de prix et recommandations sur le meilleur moment d’achat.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreateFavorite}
                  disabled={createFavorite.isPending}
                  className="flex-1 btn-gradient"
                >
                  {createFavorite.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    'Commencer le suivi'
                  )}
                </Button>
                <Button variant="outline" onClick={closeTrackerModal} disabled={createFavorite.isPending} className="flex-1">
                  Plus tard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    <div className="min-h-screen bg-gradient-modern flex flex-col">
      {/* Simple Header */}
      <div className="glass-card-subtle border-b-0 sticky top-0 z-40">
        <div className="container-modern py-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => router.push('/')} variant="ghost" size="sm" className="hover:bg-white/20 dark:hover:bg-gray-700/50">
              <ArrowLeft className="w-4 h-4 mr-2" />
            
            </Button>
            <div className="flex items-center gap-3">

              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleOpenAlertModal}
                className="hover:bg-white/20 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300"
              >
                <Bell className="w-4 h-4 mr-2" />
                Créer une alerte
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 relative flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="container-modern py-8 space-y-6">
            
            {/* User Message - Search Query */}
            <div className="flex items-start gap-4 justify-end">
              <div className="flex-1 max-w-2xl">
                <div className="bg-gradient-primary text-white rounded-2xl rounded-tr-md p-4 shadow-modern border border-white/10">
                  <p className="text-lg font-medium">{job.query}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                  Vous • {new Date(job.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Avatar className="h-10 w-10 ring-2 ring-white/20">
                <AvatarFallback className="bg-gradient-primary text-white">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Valet Status Message */}
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10 ring-2 ring-white/20">
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 max-w-2xl">
                <div className="glass-card-subtle rounded-2xl rounded-tl-md p-4 shadow-modern">
                  <div className="flex items-center gap-3 mb-2">
                    {STATUS_ICONS[job.status]}
                    <p className="font-semibold text-gray-900 dark:text-white">Okeyo Ai</p>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {STATUS_MESSAGES[job.status]}
                  </p>
                  {job.error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{job.error}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Okeyo Ai • {new Date(job.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Product Results Message */}
            {isCompleted && job.result && job.result.products.length > 0 && (
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10 ring-2 ring-white/20">
                  <AvatarFallback className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                    <CheckCircle className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 max-w-full">
                  <div className="glass-card-subtle rounded-2xl rounded-tl-md p-6 shadow-modern">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-gray-900 dark:text-white">Okeyo Ai</p>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
                      J&apos;ai trouvé <span className="text-gradient-primary font-bold">{job.result.products.length}</span> excellent{job.result.products.length > 1 ? 's' : ''} produit{job.result.products.length > 1 ? 's' : ''} parmi {job.result.totalFound} résultats. Voici ma sélection :
                    </p>
                    
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                      {job.result.products.map((product) => (
                        <ProductCard
                          key={product.id}
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          currency={product.currency}
                          url={product.url}
                          imageUrl={product.imageUrl}
                          snippet={product.snippet}
                          source={product.source}
                          onTracker={handleTrackerClick}
                        />
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 <strong>Conseil :</strong> Cliquez sur &quot;Voir le produit&quot; pour accéder directement à la page de l&apos;article.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Okeyo Ai • {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {/* No Results Message */}
            {isCompleted && job.result && job.result.products.length === 0 && (
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10 ring-2 ring-white/20">
                  <AvatarFallback className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                    <AlertCircle className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 max-w-2xl">
                  <div className="glass-card-subtle rounded-2xl rounded-tl-md p-6 shadow-modern">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <p className="font-semibold text-gray-900 dark:text-white">Okeyo Ai</p>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
                      Je n&apos;ai malheureusement trouvé aucun produit correspondant à votre recherche &quot;{job.query}&quot; dans le pays sélectionné.
                    </p>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">💡 Quelques suggestions :</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                        <li>• Essayez des mots-clés plus génériques</li>
                        <li>• Vérifiez l&apos;orthographe</li>
                        <li>• Changez de pays dans vos paramètres</li>
                      </ul>
                      <Button onClick={() => router.push('/')} className="btn-gradient mt-4">
                        Nouvelle recherche
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Okeyo Ai • {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <div ref={bottomRef} />
    </div>
    </>
  )
}
