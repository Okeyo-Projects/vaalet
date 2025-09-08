"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProductCard } from "@/components/ProductCard"
import { getApiBase } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Loader2, Bot, User, Sparkles, Bell, Search, Target, Zap, X, Eye, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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
  const [job, setJob] = useState<SearchJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [trackerModal, setTrackerModal] = useState<{isOpen: boolean, productId: string, productName: string} | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!jobId) return

    const fetchJob = async () => {
      try {
        const base = getApiBase()
        const res = await fetch(`${base}/jobs/${jobId}`)
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('Recherche introuvable')
          } else {
            throw new Error(`HTTP ${res.status}`)
          }
          return
        }

        const jobData = await res.json()
        setJob(jobData)
        
        // Continue polling if job is not finished
        if (jobData.status !== 'completed' && jobData.status !== 'failed') {
          setTimeout(fetchJob, 1500)
        }
      } catch (err) {
        console.error('Failed to fetch job:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  useEffect(() => {
    const el = scrollRef.current
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight
      bottomRef.current?.scrollIntoView({ block: "end" })
    })
  }, [job])

  if (loading) {
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

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-modern flex items-center justify-center">
        <Card className="glass-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Erreur</h2>
              <p className="text-gray-600 dark:text-gray-300">{error || 'Recherche introuvable'}</p>
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

  const isCompleted = job.status === 'completed'

  const handleTrackerClick = (productId: string, productName: string) => {
    setTrackerModal({ isOpen: true, productId, productName })
  }

  const closeTrackerModal = () => {
    setTrackerModal(null)
  }

  return (
    <>
      {/* Search Alert Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600" />
                    Alerte de Recherche
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Restez informé des nouveaux produits correspondant à votre recherche
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Surveillance Continue</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Notre système surveille 24h/24 votre recherche &quot;{job?.query}&quot;
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Produits Pertinents</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Recevez une alerte quand de nouveaux produits correspondant à vos critères sont disponibles
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Alertes Instantanées</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Notifications par email et dans l&apos;app dès qu&apos;une opportunité se présente
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Analyse IA</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Notre IA évalue la qualité des nouveaux produits et ne vous alerte que pour les meilleures offres
                    </p>
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    🚀 <strong>Pays :</strong> Cette alerte sera active pour {job?.country.toUpperCase()} et vous recevrez des notifications pour les nouveaux produits dans ce pays.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => setIsAlertModalOpen(false)}
                    className="flex-1 btn-gradient"
                  >
                    Créer l&apos;Alerte
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAlertModalOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Tracker Modal */}
      {trackerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Suivi de Produit
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Suivez &quot;{trackerModal.productName}&quot; pour ne jamais rater une bonne affaire
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeTrackerModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Suivi des Prix</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Recevez des alertes instantanées lorsque le prix baisse
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Alerte Stock</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Soyez notifié si le produit devient indisponible ou revient en stock
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Meilleur Moment d&apos;Achat</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Notre IA analyse les tendances et vous conseille le moment optimal pour acheter
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Analyse de Tendances</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Historique des prix et prédictions basées sur les données du marché
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>Gratuit :</strong> Le suivi de produits est entièrement gratuit et vous pouvez suivre jusqu&apos;à 50 produits.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={closeTrackerModal}
                    className="flex-1 btn-gradient"
                  >
                    Commencer le Suivi
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={closeTrackerModal}
                    className="flex-1"
                  >
                    Plus Tard
                  </Button>
                </div>
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
              Nouvelle recherche
            </Button>
            <div className="flex items-center gap-3">

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsAlertModalOpen(true)}
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
                    <p className="font-semibold text-gray-900 dark:text-white">Valet</p>
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
                  Valet • {new Date(job.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
                      <p className="font-semibold text-gray-900 dark:text-white">Valet</p>
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
                    Valet • {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
                      <p className="font-semibold text-gray-900 dark:text-white">Valet</p>
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
                    Valet • {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
